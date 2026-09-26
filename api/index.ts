import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

export function resolveApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
  ];
  for (const key of candidates) {
    if (
      key &&
      key.trim() !== '' &&
      key !== 'MY_GEMINI_API_KEY' &&
      key !== 'GEMINI_API_KEY'
    ) {
      return key.trim();
    }
  }
  return '';
}

export function getAiClient(): GoogleGenAI {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. In Vercel, go to Project Settings → Environment Variables, add GEMINI_API_KEY (from aistudio.google.com/apikey), and Redeploy.'
    );
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

export function formatCleanError(error: unknown, fallbackMsg: string): string {
  if (error instanceof Error) {
    let msg = error.message;
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      // not JSON
    }
    if (msg.includes('API key not valid')) {
      return 'Invalid GEMINI_API_KEY on Vercel. Please add a valid key (starting with AIza...) from aistudio.google.com/apikey in Vercel Settings → Environment Variables and redeploy.';
    }
    return msg;
  }
  return fallbackMsg;
}

const app = express();
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasKey: Boolean(resolveApiKey()) });
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

    const contents = messages.map((m: { role: string; text: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const tools: Array<Record<string, unknown>> = [];
    if (useMaps) {
      tools.push({ googleMaps: {} });
    } else if (useSearch) {
      tools.push({ googleSearch: {} });
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawChunks: any[] =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: { title: string; uri: string; type: 'web' | 'maps' }[] = [];

    for (const chunk of rawChunks) {
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

    let outputText = '';
    try {
      outputText = response.text || '';
    } catch {
      const parts = response.candidates?.[0]?.content?.parts || [];
      outputText = parts
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('');
    }

    res.json({
      text: outputText || 'No response generated.',
      modelUsed,
      sources,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Chat generation failed'),
    });
  }
});

// 2. Audio Transcription
app.post('/api/transcribe', async (req, res) => {
  try {
    const ai = getAiClient();
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      res.status(400).json({ error: 'Missing audioBase64 payload' });
      return;
    }

    const transcribeModels = [
      'gemini-3.5-transcribe',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ];

    let response = null;
    let lastErr: unknown = null;

    for (const m of transcribeModels) {
      try {
        response = await ai.models.generateContent({
          model: m,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: audioBase64,
                    mimeType,
                  },
                },
                {
                  text: 'Transcribe this audio recording accurately. Return only the spoken words.',
                },
              ],
            },
          ],
        });
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!response) {
      throw lastErr || new Error('Transcription failed');
    }

    res.json({
      text: response.text?.trim() || '',
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Audio transcription failed'),
    });
  }
});

// 3. Image Generation & Editing
app.post('/api/image', async (req, res) => {
  try {
    const ai = getAiClient();
    const {
      prompt,
      aspectRatio = '1:1',
      imageBase64,
      imageMimeType = 'image/png',
    } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: imageMimeType,
        },
      });
    }
    parts.push({
      text: prompt || 'Generate a high-resolution artistic image',
    });

    const imageModels = [
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
    ];

    let generatedDataUrl: string | null = null;
    let lastError: unknown = null;

    for (const imgModel of imageModels) {
      try {
        const response = await ai.models.generateContent({
          model: imgModel,
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio,
            },
          },
        });

        const candidateParts = response.candidates?.[0]?.content?.parts || [];
        for (const part of candidateParts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            generatedDataUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (generatedDataUrl) break;
      } catch (err) {
        lastError = err;
        console.warn(`Image model ${imgModel} failed, trying fallback...`);
      }
    }

    if (!generatedDataUrl) {
      throw (
        lastError ||
        new Error('No image data returned from the model. Try a different prompt.')
      );
    }

    res.json({ imageUrl: generatedDataUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Image generation failed'),
    });
  }
});

// 4. Video Generation via Veo 3.1
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
    let lastError: unknown = null;

    for (const vidModel of videoModels) {
      try {
        operation = await ai.models.generateVideos({
          model: vidModel,
          prompt:
            prompt ||
            'Cinematic slow-motion camera movement with natural lighting',
          ...(imageBase64
            ? {
                image: {
                  imageBytes: imageBase64,
                  mimeType: imageMimeType,
                },
              }
            : {}),
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: validAspect,
          },
        });
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!operation) {
      throw lastError || new Error('Failed to start video generation');
    }

    res.json({
      operationName: operation.name,
      done: Boolean(operation.done),
    });
  } catch (error) {
    console.error('Video start error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Failed to start video generation'),
    });
  }
});

// 5. Poll Video Generation Status
app.post('/api/video-status', async (req, res) => {
  try {
    const ai = getAiClient();
    const { operationName } = req.body;

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri || null;
    res.json({
      done: Boolean(updated.done),
      videoUri,
    });
  } catch (error) {
    console.error('Video poll error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Failed to poll video status'),
    });
  }
});

// 6. Download Completed Video Stream
app.post('/api/video-download', async (req, res) => {
  try {
    const ai = getAiClient();
    const { operationName } = req.body;

    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const videoUri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!videoUri) {
      res.status(404).json({ error: 'Generated video URI not ready yet' });
      return;
    }

    const apiKey = resolveApiKey();
    const dlResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!dlResponse.ok) {
      res.status(500).json({ error: 'Upstream video download failed' });
      return;
    }

    const arrayBuffer = await dlResponse.arrayBuffer();
    res.setHeader('Content-Type', 'video/mp4');
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Video download error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Video download failed'),
    });
  }
});

// 7. Music Generation (Lyria 3)
app.post('/api/music', async (req, res) => {
  try {
    const ai = getAiClient();
    const { prompt, durationType = 'clip' } = req.body;

    const model =
      durationType === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    const response = await ai.models.generateContent({
      model,
      contents:
        prompt || 'Generate an uplifting ambient electronic instrumental track.',
      config: {
        responseModalities: ['AUDIO'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let audioBase64 = '';
    let mimeType = 'audio/wav';
    let lyrics = '';

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

    if (!audioBase64) {
      res.status(500).json({ error: 'No audio stream returned by Lyria 3' });
      return;
    }

    res.json({
      audioBase64,
      mimeType,
      lyrics,
      modelUsed: model,
    });
  } catch (error) {
    console.error('Music generation error:', error);
    res.status(500).json({
      error: formatCleanError(error, 'Music generation failed'),
    });
  }
});

export default app;
