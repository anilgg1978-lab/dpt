/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  loginWithGoogle,
  logoutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { DESKTOP_LOGO_URL } from './data/mockData';
import { AudioStyle, playHapticFeedback } from './utils/haptics';

type WorkspaceTab = 'chat' | 'image' | 'video' | 'music' | 'live';
type GeminiModelId = 'gemini-3.8-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
type EffortLevel = 'Low' | 'Medium' | 'High';

interface GroundingSource {
  title: string;
  uri: string;
  type: 'web' | 'maps';
}

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: string;
  sources?: GroundingSource[];
  createdAt?: string;
}

interface ThreadSummary {
  id: string;
  title: string;
  modelId: GeminiModelId;
  reasoningEffort: EffortLevel;
}

const MODELS: {
  id: GeminiModelId;
  name: string;
  badge: string;
  desc: string;
}[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Balanced',
    desc: 'Best for everyday chat, search, and maps grounding.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Deep Reasoning',
    desc: 'Best for complex coding, architecture, and deep logic.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Ultra Fast',
    desc: 'Fastest responses for quick questions and summaries.',
  },
];

export default function App() {
  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showReasoningModal, setShowReasoningModal] = useState(false);

  // Firebase Auth & Persistence State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([
    {
      id: 'local-default',
      title: 'Welcome to NexusChat',
      modelId: 'gemini-3.8-flash',
      reasoningEffort: 'Medium',
    },
  ]);
  const [activeThreadId, setActiveThreadId] = useState<string>('local-default');
  const [messages, setMessages] = useState<MessageItem[]>([]);

  // Model & Reasoning Config
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3.8-flash');
  const [reasoningEffort, setReasoningEffort] = useState<EffortLevel>('Medium');
  const [tokenBudget, setTokenBudget] = useState<number>(16384);
  const [audioStyle, setAudioStyle] = useState<AudioStyle>('mechanical');

  // Chat Composer & Grounding Toggles
  const [inputPrompt, setInputPrompt] = useState('');
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Audio Transcription (Mic in Composer)
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Image Studio State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspect, setImageAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [uploadImageBase64, setUploadImageBase64] = useState<string | null>(null);
  const [uploadImageMime, setUploadImageMime] = useState<string>('image/png');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Video Studio (Veo) State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [videoPhotoBase64, setVideoPhotoBase64] = useState<string | null>(null);
  const [videoPhotoMime, setVideoPhotoMime] = useState<string>('image/png');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStatusText, setVideoStatusText] = useState('');

  // Music Studio (Lyria) State
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicDurationType, setMusicDurationType] = useState<'clip' | 'pro'>('clip');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedLyrics, setGeneratedLyrics] = useState<string>('');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);

  // Live Voice API State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Tap below to start a real-time voice conversation');
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Status Toast
  const [toast, setToast] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // 1. Listen to Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Sync User Threads from Firestore when Authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    const threadsPath = 'threads';
    const q = query(
      collection(db, threadsPath),
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ThreadSummary[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'New Chat',
            modelId: (data.modelId as GeminiModelId) || 'gemini-3.8-flash',
            reasoningEffort: (data.reasoningEffort as EffortLevel) || 'Medium',
          };
        });
        if (list.length > 0) {
          setThreads(list);
          if (activeThreadId === 'local-default' || !list.some((t) => t.id === activeThreadId)) {
            setActiveThreadId(list[0].id);
          }
        } else {
          setThreads([]);
          setActiveThreadId('');
          setMessages([]);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, threadsPath);
      }
    );

    return () => unsub();
  }, [authReady, user]);

  // 3. Sync Messages for Active Firestore Thread
  useEffect(() => {
    if (!authReady || !user || !activeThreadId || activeThreadId.startsWith('local-')) {
      return;
    }
    const msgsPath = `threads/${activeThreadId}/messages`;
    const q = query(
      collection(db, 'threads', activeThreadId, 'messages'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const loaded: MessageItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            role: data.role as 'user' | 'assistant',
            text: data.text,
            mode: data.mode,
          };
        });
        setMessages(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, msgsPath);
      }
    );

    return () => unsub();
  }, [authReady, user, activeThreadId]);

  // Create New Chat Thread
  const handleNewChat = async () => {
    playHapticFeedback(audioStyle, 'major');
    setActiveTab('chat');
    if (user) {
      const threadId = `thread_${Date.now()}`;
      const path = `threads/${threadId}`;
      try {
        await setDoc(doc(db, 'threads', threadId), {
          ownerId: user.uid,
          title: 'New Conversation',
          modelId: selectedModel,
          reasoningEffort,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActiveThreadId(threadId);
        setMessages([]);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const localId = `local-${Date.now()}`;
      setThreads((prev) => [
        {
          id: localId,
          title: 'New Conversation',
          modelId: selectedModel,
          reasoningEffort,
        },
        ...prev,
      ]);
      setActiveThreadId(localId);
      setMessages([]);
    }
  };

  const handleDeleteThread = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playHapticFeedback(audioStyle, 'off');
    if (user && !id.startsWith('local-')) {
      try {
        await deleteDoc(doc(db, 'threads', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `threads/${id}`);
      }
    } else {
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThreadId === id) {
        setMessages([]);
      }
    }
  };

  // Send Multi-turn Chat Message
  const handleSendChat = async (overridePrompt?: string, forceSearch?: boolean, forceMaps?: boolean) => {
    const promptText = (overridePrompt ?? inputPrompt).trim();
    if (!promptText || isSendingChat) return;

    playHapticFeedback(audioStyle, 'major');
    if (!overridePrompt) setInputPrompt('');
    setIsSendingChat(true);

    const searchActive = forceSearch !== undefined ? forceSearch : useSearch;
    const mapsActive = forceMaps !== undefined ? forceMaps : useMaps;

    const userMsg: MessageItem = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text: promptText,
      mode: mapsActive ? 'maps' : searchActive ? 'search' : 'chat',
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);

    let targetThreadId = activeThreadId;

    try {
      // Persist to Firestore if signed in
      if (user) {
        if (!targetThreadId || targetThreadId.startsWith('local-')) {
          targetThreadId = `thread_${Date.now()}`;
          await setDoc(doc(db, 'threads', targetThreadId), {
            ownerId: user.uid,
            title: promptText.slice(0, 60),
            modelId: selectedModel,
            reasoningEffort,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setActiveThreadId(targetThreadId);
        } else if (messages.length === 0) {
          await updateDoc(doc(db, 'threads', targetThreadId), {
            title: promptText.slice(0, 60),
            modelId: selectedModel,
            reasoningEffort,
            updatedAt: serverTimestamp(),
          });
        }

        await addDoc(collection(db, 'threads', targetThreadId, 'messages'), {
          threadId: targetThreadId,
          ownerId: user.uid,
          role: 'user',
          text: promptText.slice(0, 19000),
          mode: userMsg.mode || 'chat',
          createdAt: serverTimestamp(),
        });
      } else if (messages.length === 0) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId ? { ...t, title: promptText.slice(0, 40) } : t
          )
        );
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
          model: selectedModel,
          reasoningEffort,
          useSearch: searchActive,
          useMaps: mapsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      const assistantText = data.text || 'No response generated.';
      const assistantMsg: MessageItem = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        text: assistantText,
        mode: userMsg.mode,
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (user && targetThreadId && !targetThreadId.startsWith('local-')) {
        await addDoc(collection(db, 'threads', targetThreadId, 'messages'), {
          threadId: targetThreadId,
          ownerId: user.uid,
          role: 'assistant',
          text: assistantText.slice(0, 19000),
          mode: userMsg.mode || 'chat',
          createdAt: serverTimestamp(),
        });
      }

      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Chat error');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Microphone Audio Recording & Transcription (gemini-3.5-transcribe)
  const handleToggleMicTranscribe = async () => {
    if (isRecordingMic) {
      mediaRecorderRef.current?.stop();
      setIsRecordingMic(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Str = (reader.result as string).split(',')[1];
          if (!base64Str) return;
          setIsTranscribing(true);
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Str,
                mimeType: blob.type || 'audio/webm',
              }),
            });
            const data = await res.json();
            if (data.text) {
              setInputPrompt((prev) => (prev ? `${prev} ${data.text}` : data.text));
              showToast('Audio transcribed!');
            } else if (data.error) {
              showToast(data.error);
            }
          } catch {
            showToast('Failed to transcribe audio');
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingMic(true);
    } catch {
      showToast('Microphone permission denied');
    }
  };

  // File helper for Image & Video uploads
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'image' | 'video'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (target === 'image') {
        setUploadImageBase64(base64);
        setUploadImageMime(file.type || 'image/png');
      } else {
        setVideoPhotoBase64(base64);
        setVideoPhotoMime(file.type || 'image/png');
      }
    };
    reader.readAsDataURL(file);
  };

  // Create or Edit Image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() && !uploadImageBase64) return;
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: imageAspect,
          imageBase64: uploadImageBase64,
          imageMimeType: uploadImageMime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      setGeneratedImageUrl(data.imageUrl);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image generation failed');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Generate Video from Text or Photo (Veo 3.1)
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() && !videoPhotoBase64) return;
    setIsGeneratingVideo(true);
    setGeneratedVideoUrl(null);
    setVideoStatusText('Starting Veo 3.1 video generation...');

    try {
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspect,
          imageBase64: videoPhotoBase64,
          imageMimeType: videoPhotoMime,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start video');

      const operationName = startData.operationName;
      let isDone = false;
      let attempts = 0;

      while (!isDone && attempts < 60) {
        attempts++;
        setVideoStatusText(
          `Rendering video frames with Veo 3.1... (${attempts * 5}s elapsed)`
        );
        await new Promise((r) => setTimeout(r, 5000));
        const statusRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const statusData = await statusRes.json();
        if (statusData.done) {
          isDone = true;
        }
      }

      setVideoStatusText('Downloading generated MP4 stream...');
      const dlRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });
      if (!dlRes.ok) throw new Error('Failed to download completed video');
      const videoBlob = await dlRes.blob();
      setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
      setVideoStatusText('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Video generation error');
      setVideoStatusText('');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Generate Music (Lyria 3)
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) return;
    setIsGeneratingMusic(true);
    setGeneratedAudioUrl(null);
    setGeneratedLyrics('');
    try {
      const res = await fetch('/api/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          durationType: musicDurationType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Music generation failed');

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      setGeneratedAudioUrl(URL.createObjectURL(blob));
      setGeneratedLyrics(data.lyrics || '');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Music generation failed');
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  // Real-time Voice Conversation (gemini-3.8-live)
  const stopLiveVoice = () => {
    liveWsRef.current?.close();
    liveWsRef.current = null;
    liveStreamRef.current?.getTracks().forEach((t) => t.stop());
    liveStreamRef.current = null;
    liveInputCtxRef.current?.close().catch(() => {});
    liveOutputCtxRef.current?.close().catch(() => {});
    setIsLiveConnected(false);
    setLiveStatus('Voice session ended. Tap to start again.');
  };

  const startLiveVoice = async () => {
    if (isLiveConnected) {
      stopLiveVoice();
      return;
    }

    try {
      setLiveStatus('Connecting to Gemini 3.8 Live...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      liveWsRef.current = ws;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      liveInputCtxRef.current = inputCtx;
      liveOutputCtxRef.current = outputCtx;
      nextPlayTimeRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveStreamRef.current = stream;

      ws.onopen = () => {
        setIsLiveConnected(true);
        setLiveStatus('Listening... Speak naturally with Nexus');

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const bytes = new Uint8Array(int16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          ws.send(JSON.stringify({ audio: btoa(binary) }));
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            showToast(msg.error);
            stopLiveVoice();
            return;
          }
          if (msg.audio && liveOutputCtxRef.current) {
            const ctx = liveOutputCtxRef.current;
            const binary = atob(msg.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768;
            }
            const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);

            const src = ctx.createBufferSource();
            src.buffer = audioBuffer;
            src.connect(ctx.destination);

            const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
            src.start(startTime);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        stopLiveVoice();
      };
    } catch {
      showToast('Could not start Live Voice session');
      stopLiveVoice();
    }
  };

  const currentModelInfo =
    MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 bg-surface-container-high border border-primary/40 text-on-surface px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm">
          <span className="material-symbols-outlined text-primary text-[18px]">
            info
          </span>
          <span>{toast}</span>
        </div>
      )}

      {/* SIMPLE LEFT SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/20 z-40 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 p-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <img
                src={DESKTOP_LOGO_URL}
                alt="NexusChat"
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-md object-contain"
              />
              <span className="text-base font-semibold tracking-tight text-on-surface">
                NexusChat
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
              title="Close sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">
                dock_to_right
              </span>
            </button>
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-on-primary font-medium text-sm hover:opacity-95 transition-opacity cursor-pointer mb-5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Chat</span>
          </button>

          {/* Saved Conversations */}
          <div className="text-xs font-medium text-outline uppercase tracking-wider mb-2 px-1">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {threads.map((t) => {
              const isSelected = t.id === activeThreadId;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setActiveThreadId(t.id);
                    setActiveTab('chat');
                  }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-surface-container-high text-on-surface font-medium'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span className="truncate">{t.title}</span>
                  {threads.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteThread(e, t.id)}
                      className="opacity-0 group-hover:opacity-100 text-outline hover:text-error p-0.5 rounded cursor-pointer"
                      title="Delete chat"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Simple Auth / User Footer */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-lowest/40">
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-semibold text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-on-surface truncate">
                    {user.displayName || 'Signed In'}
                  </div>
                  <div className="text-[11px] text-primary truncate">
                    Synced with Firestore
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logoutUser()}
                className="text-xs text-outline hover:text-error px-2 py-1 rounded cursor-pointer"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                loginWithGoogle().catch(() =>
                  showToast('Sign-in popup was closed')
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                login
              </span>
              <span>Sign in with Google to Save Chats</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          sidebarOpen ? 'lg:pl-64' : 'pl-0'
        }`}
      >
        {/* CLEAN 3-ZONE TOP HEADER */}
        <header className="sticky top-0 z-30 h-14 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20 px-4 lg:px-6 flex items-center justify-between gap-3">
          {/* Left Zone: Sidebar Toggle + Model & Reasoning Triggers */}
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                title="Open sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowModelModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-sm font-medium text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-[17px]">
                auto_awesome
              </span>
              <span>{currentModelInfo.name}</span>
              <span className="material-symbols-outlined text-outline text-[16px]">
                expand_more
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowReasoningModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-tertiary text-[16px]">
                psychology
              </span>
              <span>Effort: {reasoningEffort}</span>
            </button>
          </div>

          {/* Center/Right Zone: Clean 5-Tab Mode Switcher */}
          <nav className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'chat', label: 'Chat', icon: 'chat_bubble' },
                { id: 'image', label: 'Images', icon: 'image' },
                { id: 'video', label: 'Video', icon: 'movie' },
                { id: 'music', label: 'Music', icon: 'music_note' },
                { id: 'live', label: 'Live Voice', icon: 'graphic_eq' },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 980);
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-primary text-on-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* MODE 1: SIMPLE & CLEAN CHAT VIEW */}
        {activeTab === 'chat' && (
          <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pt-6 pb-44">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-12">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">
                    auto_awesome
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-on-surface mb-2">
                  How can I help you today?
                </h1>
                <p className="text-sm text-on-surface-variant max-w-md mb-8">
                  Chat with {currentModelInfo.name}, ground answers with live Google Search or Google Maps, or switch tabs above to create images, videos, and music.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setUseSearch(true);
                      setUseMaps(false);
                      handleSendChat(
                        'What are the biggest technology breakthroughs announced this week?',
                        true,
                        false
                      );
                    }}
                    className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                      public
                    </span>
                    <div>
                      <div className="text-sm font-medium text-on-surface">
                        Live Google Search
                      </div>
                      <div className="text-xs text-outline mt-0.5">
                        Latest tech breakthroughs this week
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUseMaps(true);
                      setUseSearch(false);
                      handleSendChat(
                        'Find the best specialty coffee roasters and cafes in San Francisco.',
                        false,
                        true
                      );
                    }}
                    className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                      location_on
                    </span>
                    <div>
                      <div className="text-sm font-medium text-on-surface">
                        Google Maps Grounding
                      </div>
                      <div className="text-xs text-outline mt-0.5">
                        Top specialty coffee shops in SF
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSendChat(
                        'Show me a clean TypeScript worker queue pattern with retry backoff.'
                      )
                    }
                    className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">
                      code
                    </span>
                    <div>
                      <div className="text-sm font-medium text-on-surface">
                        Clean Code Architecture
                      </div>
                      <div className="text-xs text-outline mt-0.5">
                        TypeScript worker queue with backoff
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('image')}
                    className="p-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                      image
                    </span>
                    <div>
                      <div className="text-sm font-medium text-on-surface">
                        Create Image, Video or Music
                      </div>
                      <div className="text-xs text-outline mt-0.5">
                        Open the multimodal creative studios
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-surface-container-high text-on-surface'
                          : 'bg-surface-container text-on-surface'
                      }`}
                    >
                      {m.text}

                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-outline-variant/30 flex flex-wrap gap-2">
                          {m.sources.map((src, idx) => (
                            <a
                              key={idx}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-2 py-1 rounded-md"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {src.type === 'maps' ? 'location_on' : 'public'}
                              </span>
                              <span className="truncate max-w-[200px]">
                                {src.title}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isSendingChat && (
                  <div className="flex items-center gap-2 text-xs text-outline px-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span>Thinking with {currentModelInfo.name}...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}

            {/* SIMPLE BOTTOM COMPOSER */}
            <div
              className={`fixed bottom-0 right-0 ${
                sidebarOpen ? 'lg:left-64 left-0' : 'left-0'
              } bg-gradient-to-t from-surface via-surface/95 to-transparent pt-4 pb-4 px-4 z-30`}
            >
              <div className="max-w-3xl mx-auto bg-surface-container-high rounded-2xl p-3 shadow-xl border border-outline-variant/20">
                <textarea
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  rows={2}
                  placeholder="Ask anything..."
                  className="w-full bg-transparent text-sm text-on-surface placeholder:text-outline resize-none focus:outline-none px-1"
                />

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 mt-1 gap-2 flex-wrap">
                  {/* Simple Tool Toggles */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !useSearch;
                        setUseSearch(next);
                        if (next) setUseMaps(false);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        useSearch
                          ? 'bg-secondary/20 text-secondary border border-secondary/40'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        public
                      </span>
                      <span>Google Search</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !useMaps;
                        setUseMaps(next);
                        if (next) setUseSearch(false);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        useMaps
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        location_on
                      </span>
                      <span>Google Maps</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowReasoningModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-tertiary">
                        tune
                      </span>
                      <span>
                        Reasoning: {reasoningEffort} ({Math.round(tokenBudget / 1024)}k)
                      </span>
                    </button>
                  </div>

                  {/* Mic Transcribe + Send Button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleMicTranscribe}
                      disabled={isTranscribing}
                      title="Record voice & transcribe into text (gemini-3.5-transcribe)"
                      className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                        isRecordingMic
                          ? 'bg-error text-on-error animate-pulse'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isRecordingMic ? 'stop_circle' : 'mic'}
                      </span>
                      <span>
                        {isTranscribing
                          ? 'Transcribing...'
                          : isRecordingMic
                            ? 'Stop'
                            : 'Transcribe'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendChat()}
                      disabled={isSendingChat || !inputPrompt.trim()}
                      className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 cursor-pointer"
                      title="Send message"
                    >
                      <span className="material-symbols-outlined text-[18px] font-bold">
                        arrow_upward
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* MODE 2: IMAGE STUDIO (Create & Edit Images) */}
        {activeTab === 'image' && (
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                Create &amp; Edit Images
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Generate new visuals or upload an existing image to edit with a text prompt using Gemini 3.1 Flash Image.
              </p>
            </div>

            <div className="bg-surface-container rounded-2xl p-5 space-y-4">
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                placeholder="Describe the image you want to create or how to edit your uploaded photo..."
                className="w-full bg-surface-container-low rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-outline">Aspect Ratio:</span>
                  {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspect(ratio)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        imageAspect === ratio
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-medium text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    upload_file
                  </span>
                  <span>
                    {uploadImageBase64 ? 'Change Reference Image' : 'Upload Image to Edit'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'image')}
                  />
                </label>
              </div>

              {uploadImageBase64 && (
                <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg text-xs">
                  <span className="text-primary">Reference image attached for editing</span>
                  <button
                    type="button"
                    onClick={() => setUploadImageBase64(null)}
                    className="text-outline hover:text-error cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || (!imagePrompt.trim() && !uploadImageBase64)}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  auto_awesome
                </span>
                <span>
                  {isGeneratingImage
                    ? 'Generating Image...'
                    : uploadImageBase64
                      ? 'Edit Image'
                      : 'Generate Image'}
                </span>
              </button>
            </div>

            {generatedImageUrl && (
              <div className="bg-surface-container rounded-2xl p-4 space-y-3">
                <img
                  src={generatedImageUrl}
                  alt={imagePrompt || 'Generated result'}
                  referrerPolicy="no-referrer"
                  className="w-full rounded-xl object-contain max-h-[460px]"
                />
                <div className="flex justify-end">
                  <a
                    href={generatedImageUrl}
                    download="nexus-image.png"
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high text-xs font-medium text-on-surface hover:text-primary inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      download
                    </span>
                    <span>Download Image</span>
                  </a>
                </div>
              </div>
            )}
          </main>
        )}

        {/* MODE 3: VIDEO STUDIO (Veo Text-to-Video & Animate Photo) */}
        {activeTab === 'video' && (
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                Veo 3.1 Video Studio
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Generate video from text or upload a photo to animate it into a video (`16:9` Landscape or `9:16` Portrait).
              </p>
            </div>

            <div className="bg-surface-container rounded-2xl p-5 space-y-4">
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                rows={3}
                placeholder="Describe the motion, camera angle, and scene..."
                className="w-full bg-surface-container-low rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-outline">Aspect Ratio:</span>
                  {(
                    [
                      { id: '16:9', label: '16:9 Landscape' },
                      { id: '9:16', label: '9:16 Portrait' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setVideoAspect(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        videoAspect === item.id
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-medium text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    add_photo_alternate
                  </span>
                  <span>
                    {videoPhotoBase64 ? 'Change Starting Photo' : 'Upload Photo to Animate'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'video')}
                  />
                </label>
              </div>

              {videoPhotoBase64 && (
                <div className="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg text-xs">
                  <span className="text-primary">Photo ready to animate with Veo</span>
                  <button
                    type="button"
                    onClick={() => setVideoPhotoBase64(null)}
                    className="text-outline hover:text-error cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || (!videoPrompt.trim() && !videoPhotoBase64)}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">movie</span>
                <span>
                  {isGeneratingVideo
                    ? 'Generating Video...'
                    : videoPhotoBase64
                      ? 'Animate Photo into Video'
                      : 'Generate Video from Text'}
                </span>
              </button>

              {videoStatusText && (
                <div className="text-xs text-primary text-center animate-pulse">
                  {videoStatusText}
                </div>
              )}
            </div>

            {generatedVideoUrl && (
              <div className="bg-surface-container rounded-2xl p-4 space-y-3">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full rounded-xl max-h-[460px] bg-black"
                />
              </div>
            )}
          </main>
        )}

        {/* MODE 4: MUSIC STUDIO (Lyria 3) */}
        {activeTab === 'music' && (
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                Lyria 3 Music Generator
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Create 30-second music clips or full-length tracks from a text prompt.
              </p>
            </div>

            <div className="bg-surface-container rounded-2xl p-5 space-y-4">
              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                rows={3}
                placeholder="Describe the genre, instruments, tempo, and mood (e.g., Warm lo-fi synthwave beat with acoustic piano)..."
                className="w-full bg-surface-container-low rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-outline">Track Length:</span>
                <button
                  type="button"
                  onClick={() => setMusicDurationType('clip')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    musicDurationType === 'clip'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  30s Clip (Lyria Clip)
                </button>
                <button
                  type="button"
                  onClick={() => setMusicDurationType('pro')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    musicDurationType === 'pro'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  Full Track (Lyria Pro)
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerateMusic}
                disabled={isGeneratingMusic || !musicPrompt.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  music_note
                </span>
                <span>
                  {isGeneratingMusic ? 'Composing Track...' : 'Generate Music'}
                </span>
              </button>
            </div>

            {generatedAudioUrl && (
              <div className="bg-surface-container rounded-2xl p-5 space-y-3">
                <div className="text-xs font-medium text-primary">
                  Generated Audio Track
                </div>
                <audio src={generatedAudioUrl} controls className="w-full" />
                {generatedLyrics && (
                  <div className="pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant whitespace-pre-wrap">
                    {generatedLyrics}
                  </div>
                )}
              </div>
            )}
          </main>
        )}

        {/* MODE 5: LIVE VOICE CONVERSATION (gemini-3.8-live) */}
        {activeTab === 'live' && (
          <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
            <div
              className={`w-28 h-28 rounded-full flex items-center justify-center mb-6 transition-all ${
                isLiveConnected
                  ? 'bg-primary/20 text-primary ring-8 ring-primary/10 animate-pulse'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[44px]">
                {isLiveConnected ? 'graphic_eq' : 'mic'}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-on-surface mb-2">
              Gemini 3.8 Live Voice
            </h2>
            <p className="text-sm text-on-surface-variant max-w-sm mb-8">
              {liveStatus}
            </p>

            <button
              type="button"
              onClick={startLiveVoice}
              className={`px-6 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all shadow-lg ${
                isLiveConnected
                  ? 'bg-error text-on-error'
                  : 'bg-primary text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isLiveConnected ? 'call_end' : 'record_voice_over'}
              </span>
              <span>
                {isLiveConnected ? 'End Voice Session' : 'Start Voice Conversation'}
              </span>
            </button>
          </main>
        )}
      </div>

      {/* CLEAN MODAL 1: SELECT MODEL */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowModelModal(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-surface-container rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-on-surface">
                Select Gemini Model
              </h3>
              <button
                type="button"
                onClick={() => setShowModelModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {MODELS.map((m) => {
                const active = selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      playHapticFeedback(audioStyle, 'major');
                      setSelectedModel(m.id);
                      setShowModelModal(false);
                    }}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      active
                        ? 'bg-primary/15 border border-primary/40'
                        : 'bg-surface-container-low hover:bg-surface-container-high'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">
                          {m.name}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-surface-container-highest text-primary">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {m.desc}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        active ? 'bg-primary text-on-primary' : 'bg-surface-container-highest'
                      }`}
                    >
                      {active && (
                        <span className="material-symbols-outlined text-[14px] font-bold">
                          check
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CLEAN MODAL 2: REASONING EFFORT & HAPTICS */}
      {showReasoningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowReasoningModal(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md bg-surface-container rounded-2xl p-5 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-on-surface">
                  Reasoning Effort &amp; Thinking Budget
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Adjust how deeply Gemini thinks before responding.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReasoningModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* 3-Way Preset */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-surface-container-lowest">
              {(['Low', 'Medium', 'High'] as const).map((level) => {
                const active = reasoningEffort === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      playHapticFeedback(audioStyle, 'preset');
                      setReasoningEffort(level);
                      setTokenBudget(
                        level === 'Low' ? 4096 : level === 'Medium' ? 16384 : 32768
                      );
                    }}
                    className={`py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      active
                        ? 'bg-primary text-on-primary font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>

            {/* Thinking Token Slider */}
            <div className="bg-surface-container-low p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface font-medium">Thinking Budget</span>
                <span className="font-code-inline text-primary font-semibold">
                  {tokenBudget.toLocaleString()} tokens
                </span>
              </div>
              <input
                type="range"
                min={1024}
                max={32768}
                step={1024}
                value={tokenBudget}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  playHapticFeedback(audioStyle, 'subtle', 900);
                  setTokenBudget(val);
                  setReasoningEffort(
                    val <= 6144 ? 'Low' : val <= 20480 ? 'Medium' : 'High'
                  );
                }}
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-outline">
                <span>1k (Fast)</span>
                <span>16k (Balanced)</span>
                <span>32k (Deep)</span>
              </div>
            </div>

            {/* Haptic Sound Style */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-on-surface-variant">
                Haptic Audio Feedback
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'mechanical', label: 'Click' },
                    { id: 'bubble', label: 'Bubble' },
                    { id: 'muted', label: 'Muted' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setAudioStyle(s.id);
                      playHapticFeedback(s.id, 'major');
                    }}
                    className={`py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      audioStyle === s.id
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReasoningModal(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
