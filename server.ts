import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import path from 'path';
import { LiveServerMessage, Modality } from '@google/genai';
import app, { getAiClient, formatCleanError } from './api/index.ts';

const PORT = 3000;

async function startServer() {
  const httpServer = createHttpServer(app);

  // 8. Real-time Voice Conversation WebSocket (/live) using gemini-3.8-live
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

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
      server: {
        middlewareMode: true,
        // Attach Vite HMR to the same HTTP server as the app so the preview
        // proxy can complete the WebSocket upgrade instead of retrying a
        // separate, unopened connection.
        hmr: { server: httpServer },
      },
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
