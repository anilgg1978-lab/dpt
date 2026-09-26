import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import path from 'path';
import {
  GoogleGenAI,
  GenerateVideosOperation,
  LiveServerMessage,
  Modality,
} from '@google/genai';

const PORT = 3000;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatCleanError(error: unknown, fallbackMsg: string): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // not JSON
    }
    return error.message;
  }
  return fallbackMsg;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const httpServer = createHttpServer(app);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Multi-turn Gemini Chat + Google Search Grounding + Google Maps Grounding
  app.post('/api/chat', async (req, res) => {
    try {
      const ai = getAiClient();
      const {
        messages = [],
        model = 'gemini-3.5-flash',
        useSearch = false,
        useMaps = false,
      } = req.body;

      // Build contents array for multi-turn conversation
      const contents = messages.map((m: { role: string; text: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }));

      // Configure tools (googleMaps cannot be combined with googleSearch in the same request)
      const tools: Array<Record<string, unknown>> = [];
      if (useMaps) {
        tools.push({ googleMaps: {} });
      } else if (useSearch) {
        tools.push({ googleSearch: {} });
      }

      // Build resilient fallback list starting with the user's chosen model
      const candidateModels = Array.from(
        new Set([
          model,
          'gemini-3.5-flash',
          'gemini-flash-latest',
          'gemini-3.1-flash-lite',
          'gemini-3.8-flash',
        ])
      );

      let response = null;
      let modelUsed = candidateModels[0];
      let lastError: unknown = null;

      for (const candidate of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: candidate,
            contents,
            config: {
              systemInstruction:
                'You are Nexus, a clear, helpful, and concise AI assistant. Format answers cleanly using markdown.',
              ...(tools.length > 0 ? { tools } : {}),
            },
          });
          modelUsed = candidate;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`Model ${candidate} failed, trying next fallback...`);
        }
      }

      if (!response) {
        throw lastError || new Error('All Gemini models are currently busy.');
      }

      // Extract grounding sources if present
      const rawChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: { title: string; uri: string; type: 'web' | 'maps' }[] = [];

      for (const chunk of rawChunks as Array<{
        web?: { uri?: string; title?: string };
        maps?: { uri?: string; title?: string };
      }>) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
            type: 'web',
          });
        }
        if (chunk.maps?.uri) {
          sources.push({
            title: chunk.maps.title || 'Google Maps Place',
            uri: chunk.maps.uri,
            type: 'maps',
          });
        }
      }

      res.json({
        text: response.text || '',
        modelUsed,
        sources,
      });
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Chat generation failed'),
      });
    }
  });

  // 2. Create & Edit Images (gemini-3.1-flash-image-preview / gemini-3.1-flash-image / gemini-3.1-flash-lite-image)
  app.post('/api/image', async (req, res) => {
    try {
      const ai = getAiClient();
      const {
        prompt,
        aspectRatio = '1:1',
        imageBase64,
        imageMimeType = 'image/png',
      } = req.body;

      const parts: Array<Record<string, unknown>> = [];
      if (imageBase64) {
        parts.push({
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType,
          },
        });
      }
      parts.push({ text: prompt || 'Generate a high-resolution artistic image' });

      const imageModels = [
        'gemini-3.1-flash-image-preview',
        'gemini-3.1-flash-image',
        'gemini-3.1-flash-lite-image',
      ];

      let response = null;
      let lastErr: unknown = null;

      for (const imgModel of imageModels) {
        try {
          response = await ai.models.generateContent({
            model: imgModel,
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio,
              },
            },
          });
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!response) {
        throw lastErr || new Error('Image generation failed');
      }

      let generatedImageUrl: string | null = null;
      let captionText = '';

      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          captionText += part.text;
        }
      }

      if (!generatedImageUrl) {
        throw new Error('No image was returned by the model.');
      }

      res.json({ imageUrl: generatedImageUrl, caption: captionText });
    } catch (error) {
      console.error('Image API error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Image generation failed'),
      });
    }
  });

  // 3. Veo Video Generation (veo-3.1-fast-generate-preview / veo-3.1-lite-generate-preview)
  app.post('/api/generate-video', async (req, res) => {
    try {
      const ai = getAiClient();
      const {
        prompt,
        aspectRatio = '16:9',
        imageBase64,
        imageMimeType = 'image/png',
      } = req.body;

      const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

      const videoModels = [
        'veo-3.1-fast-generate-preview',
        'veo-3.1-lite-generate-preview',
      ];

      let operation = null;
      let lastErr: unknown = null;

      for (const veoModel of videoModels) {
        try {
          const params: Record<string, unknown> = {
            model: veoModel,
            prompt:
              prompt || 'Cinematic slow-motion camera movement with natural lighting',
            config: {
              numberOfVideos: 1,
              resolution: '720p',
              aspectRatio: validAspect,
            },
          };

          if (imageBase64) {
            params.image = {
              imageBytes: imageBase64,
              mimeType: imageMimeType,
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          operation = await ai.models.generateVideos(params as any);
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!operation) {
        throw lastErr || new Error('Failed to start video generation');
      }

      res.json({ operationName: operation.name });
    } catch (error) {
      console.error('Video start error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Video generation failed to start'),
      });
    }
  });

  app.post('/api/video-status', async (req, res) => {
    try {
      const ai = getAiClient();
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: Boolean(updated.done) });
    } catch (error) {
      console.error('Video poll error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Video status check failed'),
      });
    }
  });

  app.post('/api/video-download', async (req, res) => {
    try {
      const ai = getAiClient();
      const apiKey = process.env.GEMINI_API_KEY || '';
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        res.status(404).json({ error: 'Generated video URI not found' });
        return;
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey },
      });

      if (!videoRes.ok || !videoRes.body) {
        res.status(500).json({ error: 'Failed to fetch generated video stream' });
        return;
      }

      res.setHeader('Content-Type', 'video/mp4');
      await videoRes.body.pipeTo(
        new WritableStream({
          write(chunk) {
            res.write(chunk);
          },
          close() {
            res.end();
          },
        })
      );
    } catch (error) {
      console.error('Video download error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Video download failed'),
      });
    }
  });

  // 4. Generate Music (lyria-3-clip-preview or lyria-3-pro-preview)
  app.post('/api/music', async (req, res) => {
    try {
      const ai = getAiClient();
      const { prompt, durationType = 'clip' } = req.body;
      const model =
        durationType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: prompt || 'Generate an uplifting ambient electronic track.',
        config: {
          responseModalities: [Modality.AUDIO],
        },
      });

      let audioBase64 = '';
      let lyrics = '';
      let mimeType = 'audio/wav';

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (!audioBase64) {
        throw new Error('No audio stream returned from Lyria.');
      }

      res.json({ audioBase64, mimeType, lyrics, modelUsed: model });
    } catch (error) {
      console.error('Music API error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Music generation failed'),
      });
    }
  });

  // 5. Audio Transcription (gemini-3.5-transcribe)
  app.post('/api/transcribe', async (req, res) => {
    try {
      const ai = getAiClient();
      const { audioBase64, mimeType = 'audio/webm' } = req.body;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: 'Transcribe this audio accurately.' },
          ],
        },
      });

      res.json({ text: response.text || '' });
    } catch (error) {
      console.error('Transcribe API error:', error);
      res.status(500).json({
        error: formatCleanError(error, 'Audio transcription failed'),
      });
    }
  });

  // 6. WebSocket Server for Live Voice Conversations (gemini-3.8-live)
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/live')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let liveSession: any = null;
    try {
      const ai = getAiClient();
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are Nexus, a warm, concise, and helpful voice assistant.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ text: part.text }));
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: unknown) => {
            console.error('Live session error:', err);
          },
        },
      });

      clientWs.send(JSON.stringify({ status: 'connected' }));

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && liveSession) {
            liveSession.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          }
        } catch (err) {
          console.error('Live message parse error:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          liveSession?.close?.();
        } catch {
          // ignore
        }
      });
    } catch (error) {
      console.error('Live connection setup failed:', error);
      clientWs.send(
        JSON.stringify({
          error: formatCleanError(error, 'Live API failed to connect'),
        })
      );
      clientWs.close();
    }
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusChat server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
