/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  DESKTOP_LOGO_URL,
  INITIAL_THREADS,
  MODEL_OPTIONS,
  SUGGESTION_RESPONSES,
  WORKER_SERVICE_CODE,
  ChatThreadItem,
  FollowUpTurn,
} from './data/mockData';
import { AudioStyle, playHapticFeedback } from './utils/haptics';
import { SelectModelSheet } from './components/SelectModelSheet';
import { ReasoningEffortSheet } from './components/ReasoningEffortSheet';
import {
  PromptReasoningPopover,
  PopoverVariant,
} from './components/PromptReasoningPopover';

export type ActiveScreenMode =
  | 'desktop-haptic-3way'
  | 'desktop-haptic-badge'
  | 'desktop-minimal'
  | 'mobile-select-model'
  | 'mobile-reasoning-effort';

export default function App() {
  // Screen / Modal states
  const [screenMode, setScreenMode] = useState<ActiveScreenMode>('desktop-haptic-3way');
  const [showModelSheetModal, setShowModelSheetModal] = useState(false);
  const [showReasoningSheetModal, setShowReasoningSheetModal] = useState(false);

  // Sidebar & Search state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<ChatThreadItem[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>('chat-workspace');
  const [searchQuery, setSearchQuery] = useState('');

  // Model & Reasoning Configuration state
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-4o');
  const [sessionEffort, setSessionEffort] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [codeSandboxEnabled, setCodeSandboxEnabled] = useState(false);

  // Granular Reasoning Sheet state
  const [sessionTokenBudget, setSessionTokenBudget] = useState<number>(24576);
  const [stepVerification, setStepVerification] = useState(true);
  const [showCotStream, setShowCotStream] = useState(true);
  const [deepBranchPruning, setDeepBranchPruning] = useState(true);

  // Composer & Prompt Reasoning Override Popover state
  const [popoverOpen, setPopoverOpen] = useState(true);
  const [promptBudget, setPromptBudget] = useState<number>(24576);
  const [audioStyle, setAudioStyle] = useState<AudioStyle>('mechanical');
  const [promptStreamCot, setPromptStreamCot] = useState(true);
  const [promptAutoVerify, setPromptAutoVerify] = useState(true);
  const [composerText, setComposerText] = useState('');

  // Interactive UI Feedback states
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedFullResponse, setCopiedFullResponse] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likedState, setLikedState] = useState<'up' | 'down' | null>(null);
  const [followUpTurns, setFollowUpTurns] = useState<FollowUpTurn[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeModel =
    MODEL_OPTIONS.find((m) => m.id === selectedModelId) || MODEL_OPTIONS[0];
  const activeThread =
    threads.find((t) => t.id === activeThreadId) || threads[0];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    playHapticFeedback(audioStyle, 'major');
    setCopiedCodeId(id);
    setTimeout(() => {
      setCopiedCodeId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const handleCopyFullResponse = () => {
    navigator.clipboard?.writeText(WORKER_SERVICE_CODE).catch(() => {});
    playHapticFeedback(audioStyle, 'subtle', 1020);
    setCopiedFullResponse(true);
    setTimeout(() => setCopiedFullResponse(false), 2000);
  };

  const handleNewChat = () => {
    playHapticFeedback(audioStyle, 'major');
    const newId = `chat-${Date.now()}`;
    const newThread: ChatThreadItem = {
      id: newId,
      title: 'Distributed worker architecture',
      group: 'Today',
      breadcrumb: 'project / worker-service / v1.0',
      contextTokens: '1,024 tokens',
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setFollowUpTurns([]);
    triggerToast('Started new chat session');
  };

  const handleDeleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    playHapticFeedback(audioStyle, 'off');
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeThreadId === id && next.length > 0) {
        setActiveThreadId(next[0].id);
      }
      return next;
    });
  };

  const handleSubmitPrompt = (customPrompt?: string) => {
    const text = (customPrompt ?? composerText).trim();
    if (!text) return;

    playHapticFeedback(audioStyle, 'major');
    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const presetMatch = SUGGESTION_RESPONSES[text];
    const newTurn: FollowUpTurn = presetMatch
      ? {
          id: `turn-${Date.now()}`,
          userTime: nowStr,
          reasoningBudgetUsed: promptBudget,
          ...presetMatch,
        }
      : {
          id: `turn-${Date.now()}`,
          userTime: nowStr,
          userPrompt: text,
          thoughtTime: `${(0.8 + (promptBudget / 32768) * 2.4).toFixed(1)}s`,
          thoughtPhases: [
            {
              num: '01',
              title: 'Constraint & invariant verification:',
              detail: `Evaluating architectural trade-offs within ${promptBudget.toLocaleString()} reasoning token budget.`,
            },
            {
              num: '02',
              title: 'Implementation synthesis:',
              detail: 'Generating type-safe TypeScript interfaces with deterministic fault isolation.',
            },
          ],
          intro:
            'Here is the updated production implementation tailored to your architectural specification, maintaining strict idempotency and zero-allocation hot paths.',
          codeTitle: 'Synthesized Service Module',
          codeFile: 'telemetry-adapter.ts',
          codeContent: `export interface TelemetrySpan {
  readonly traceId: string;
  readonly queueDepth: number;
  readonly saturationRatio: number;
}

export function evaluateBackpressure(span: TelemetrySpan): 'NOMINAL' | 'THROTTLE' | 'PAUSE' {
  if (span.saturationRatio >= 0.9) return 'PAUSE';
  if (span.queueDepth > 5_000 || span.saturationRatio >= 0.75) return 'THROTTLE';
  return 'NOMINAL';
}`,
          ttft: '420 ms',
          tokensPerSec: '128 tokens/sec',
          reasoningBudgetUsed: promptBudget,
        };

    setFollowUpTurns((prev) => [...prev, newTurn]);
    if (!customPrompt) setComposerText('');
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const popoverVariant: PopoverVariant =
    screenMode === 'desktop-haptic-badge'
      ? 'haptic-badge'
      : screenMode === 'desktop-minimal'
        ? 'minimal'
        : 'haptic-style-3way';

  const filteredThreads = threads.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If user selected one of the standalone mobile screens from the screen bar, show that exact mobile screen view
  if (screenMode === 'mobile-select-model') {
    return (
      <div className="min-h-screen bg-surface text-on-surface relative">
        {renderScreenSwitcherBar()}
        <SelectModelSheet
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          reasoningEffort={sessionEffort}
          onChangeReasoningEffort={setSessionEffort}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled((v) => !v)}
          codeSandboxEnabled={codeSandboxEnabled}
          onToggleCodeSandbox={() => setCodeSandboxEnabled((v) => !v)}
          onClose={() => setScreenMode('desktop-haptic-3way')}
          onNavigateTab={(tab) => {
            if (tab === 'chat') setScreenMode('desktop-haptic-3way');
            else if (tab === 'config') setScreenMode('mobile-reasoning-effort');
            else setScreenMode('desktop-haptic-3way');
          }}
          audioStyle={audioStyle}
          standaloneMobileFrame={true}
        />
      </div>
    );
  }

  if (screenMode === 'mobile-reasoning-effort') {
    return (
      <div className="min-h-screen bg-surface text-on-surface relative">
        {renderScreenSwitcherBar()}
        <ReasoningEffortSheet
          selectedModelId={selectedModelId}
          tokenBudget={sessionTokenBudget}
          onChangeTokenBudget={(val) => {
            setSessionTokenBudget(val);
            setPromptBudget(val);
          }}
          stepVerification={stepVerification}
          onToggleStepVerification={() => setStepVerification((v) => !v)}
          showCotStream={showCotStream}
          onToggleShowCotStream={() => setShowCotStream((v) => !v)}
          deepBranchPruning={deepBranchPruning}
          onToggleDeepBranchPruning={() => setDeepBranchPruning((v) => !v)}
          onClose={() => setScreenMode('desktop-haptic-3way')}
          onNavigateTab={(tab) => {
            if (tab === 'chat') setScreenMode('desktop-haptic-3way');
            else if (tab === 'prompts') setScreenMode('mobile-select-model');
            else setScreenMode('desktop-haptic-3way');
          }}
          audioStyle={audioStyle}
          standaloneMobileFrame={true}
        />
      </div>
    );
  }

  function renderScreenSwitcherBar() {
    return (
      <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[70] hidden xl:flex items-center gap-1 p-1 rounded-full bg-surface-container-lowest/90 border border-outline-variant/40 backdrop-blur-xl shadow-lg">
        {(
          [
            { id: 'desktop-haptic-3way', label: 'Workspace (3-Way Haptic)', icon: 'touch_app' },
            { id: 'desktop-haptic-badge', label: 'Workspace (Haptic Pill)', icon: 'graphic_eq' },
            { id: 'desktop-minimal', label: 'Workspace (Standard)', icon: 'tune' },
            { id: 'mobile-select-model', label: 'Select Model Sheet', icon: 'neurology' },
            { id: 'mobile-reasoning-effort', label: 'Reasoning Config Sheet', icon: 'psychology' },
          ] as const
        ).map((item) => {
          const active = screenMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playHapticFeedback(audioStyle, 'subtle', 1020);
                setScreenMode(item.id);
                if (item.id.startsWith('desktop-')) {
                  setPopoverOpen(true);
                }
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {/* Screen Switcher Pill for instant inspection of all 5 screens */}
      {renderScreenSwitcherBar()}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-[80] bg-surface-container-high border border-primary/40 text-on-surface px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 font-label-md text-label-md">
          <span className="material-symbols-outlined text-primary text-[16px]">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-surface-container-low z-50 flex flex-col justify-between select-none transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="p-space-md flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <img
                alt="Nexus AI Logo"
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
                src={DESKTOP_LOGO_URL}
              />
              <span className="font-headline-lg text-title-md font-semibold tracking-tight text-on-surface">
                NexusChat
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">dock_to_right</span>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-space-md mb-space-sm">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full flex items-center justify-between px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl transition-all shadow-[0_1px_8px_rgba(0,0,0,0.04)] cursor-pointer"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  add
                </span>
                <span className="font-label-md text-label-md font-medium">New chat</span>
              </div>
              <kbd className="font-code-inline text-label-sm px-space-xs py-space-2xs bg-surface-container-highest text-on-surface-variant rounded">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Search Input */}
          <div className="px-space-md mb-space-md">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-space-sm text-outline text-[18px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline pl-9 pr-space-sm py-1.5 rounded-lg font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search chats..."
                type="text"
              />
            </div>
          </div>

          {/* Thread Groups */}
          <div className="flex-1 overflow-y-auto px-space-sm space-y-space-md">
            {(['Today', 'Previous 7 Days', 'Previous 30 Days'] as const).map((group) => {
              const groupItems = filteredThreads.filter((t) => t.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group} className="space-y-space-2xs">
                  <div className="px-space-sm py-space-2xs font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                    {group}
                  </div>
                  <nav className="space-y-space-2xs">
                    {groupItems.map((thread) => {
                      const isCurrent = thread.id === activeThreadId;
                      return (
                        <div
                          key={thread.id}
                          onClick={() => {
                            playHapticFeedback(audioStyle, 'subtle', 940);
                            setActiveThreadId(thread.id);
                          }}
                          className={`group flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-surface-container-high text-on-surface font-medium'
                              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                          }`}
                        >
                          <div className="flex items-center gap-space-sm truncate">
                            <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary">
                              chat_bubble
                            </span>
                            <span className="truncate font-body-md text-body-md">
                              {thread.title}
                            </span>
                          </div>
                          <div className="hidden group-hover:flex items-center gap-space-2xs text-outline">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerToast(`Pinned "${thread.title}"`);
                              }}
                              className="hover:text-on-surface p-0.5 rounded cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                push_pin
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerToast(`Renamed "${thread.title}"`);
                              }}
                              className="hover:text-on-surface p-0.5 rounded cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                edit
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteThread(e, thread.id)}
                              className="hover:text-error p-0.5 rounded cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Footer Section */}
        <div className="p-space-sm bg-surface-container-lowest/60">
          <div className="p-space-sm rounded-xl hover:bg-surface-container transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-primary text-[18px]">
                    person
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-label-md text-label-md font-semibold text-on-surface truncate">
                    Alex Morgan
                  </div>
                  <div className="font-label-sm text-label-sm text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                    Pro Plan
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">
                more_vert
              </span>
            </div>
            <div className="mt-space-sm pt-space-xs border-t border-outline-variant/30 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setShowReasoningSheetModal(true)}
                className="flex items-center gap-space-sm px-space-xs py-1 rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Custom instructions
              </button>
              <button
                type="button"
                onClick={() => setShowModelSheetModal(true)}
                className="flex items-center gap-space-sm px-space-xs py-1 rounded text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                Settings &amp; Beta
              </button>
              <button
                type="button"
                onClick={() => triggerToast('Session locked — Pro workspace active')}
                className="flex items-center gap-space-sm px-space-xs py-1 rounded text-error hover:text-error-container font-label-sm text-label-sm text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Log out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div
        className={`${
          sidebarOpen ? 'lg:pl-64' : 'pl-0'
        } flex flex-col min-h-screen bg-surface transition-all duration-200`}
      >
        {/* TOP HEADER */}
        <header
          className={`fixed top-0 ${
            sidebarOpen ? 'lg:left-64 left-0' : 'left-0'
          } right-0 h-14 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg transition-all duration-200`}
        >
          <div className="flex items-center gap-space-md">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                title="Open sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            )}

            {/* Model Selector Trigger -> Opens Select Model Sheet */}
            <button
              type="button"
              onClick={() => {
                playHapticFeedback(audioStyle, 'subtle', 1000);
                setShowModelSheetModal(true);
              }}
              className="relative flex items-center gap-space-sm px-space-sm py-1.5 bg-surface-container rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  auto_awesome
                </span>
                <span className="font-label-md text-label-md font-semibold text-on-surface whitespace-nowrap">
                  {activeModel.name}
                </span>
              </div>
              <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                {activeModel.topBadge}
              </span>
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                expand_more
              </span>
            </button>

            {/* Reasoning Mode Trigger -> Opens Reasoning Effort & Thinking Sheet */}
            <button
              type="button"
              onClick={() => {
                playHapticFeedback(audioStyle, 'subtle', 1080);
                setShowReasoningSheetModal(true);
              }}
              className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg text-tertiary hover:bg-tertiary-container/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              <span className="font-label-sm text-label-sm font-medium">
                Reasoning Mode
              </span>
            </button>

            <div className="hidden md:flex items-center gap-space-xs text-outline font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>All systems nominal</span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).catch(() => {});
                triggerToast('Thread link copied to clipboard');
              }}
              className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">ios_share</span>
              <span className="font-label-sm text-label-sm hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={() => setShowModelSheetModal(true)}
              className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                space_dashboard
              </span>
              <span className="font-label-sm text-label-sm hidden sm:inline">Canvas</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 ml-space-xs">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </header>

        {/* MAIN CHAT SCROLL AREA */}
        <main className="flex-1 pt-14 bg-surface w-full">
          <div className="flex flex-col w-full relative">
            {/* Subtle Ambient Glow Canvas */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-24 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-10 w-80 h-80 bg-tertiary-container/5 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-4xl mx-auto px-gutter-md pb-80 space-y-space-2xl relative z-10">
              {/* Thread Context Breadcrumb & Architecture Telemetry */}
              <div className="pt-space-lg flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-space-sm text-outline">
                  <span className="material-symbols-outlined text-[18px]">
                    account_tree
                  </span>
                  <span className="font-code-inline text-code-inline text-on-surface-variant font-medium">
                    {activeThread.breadcrumb}
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant tabular-nums">
                    Context: {activeThread.contextTokens}
                  </span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <button
                    type="button"
                    onClick={() => setShowReasoningSheetModal(true)}
                    className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant text-label-sm font-label-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    <span>Parameters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookmarked((b) => !b);
                      triggerToast(
                        !bookmarked ? 'Thread bookmarked' : 'Bookmark removed'
                      );
                    }}
                    className={`flex items-center justify-center w-7 h-7 rounded bg-surface-container-high hover:bg-surface-container-highest transition-colors cursor-pointer ${
                      bookmarked ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {bookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                  </button>
                </div>
              </div>

              {/* USER TURN CONTAINER */}
              <div className="flex flex-col items-end group">
                <div className="flex items-center gap-space-sm mb-space-xs">
                  <span className="font-label-sm text-label-sm text-outline tabular-nums">
                    10:45 AM
                  </span>
                  <span className="font-label-sm text-label-sm font-medium text-on-surface">
                    Alex Morgan
                  </span>
                </div>
                <div className="relative max-w-2xl bg-surface-container-high text-on-surface rounded-2xl rounded-tr-sm p-space-lg shadow-md">
                  <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                    Can you show me a clean architecture pattern for a distributed task processing service in TypeScript with worker queues and fault tolerance?
                  </p>
                  {/* Hover Micro-actions */}
                  <div className="absolute -bottom-3 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-space-2xs bg-surface-container-highest px-space-xs py-0.5 rounded-full shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          ?.writeText(
                            'Can you show me a clean architecture pattern for a distributed task processing service in TypeScript with worker queues and fault tolerance?'
                          )
                          .catch(() => {});
                        triggerToast('Prompt copied');
                      }}
                      className="p-1 hover:text-primary text-on-surface-variant rounded transition-colors flex items-center cursor-pointer"
                      title="Copy query"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        content_copy
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setComposerText(
                          'Can you show me a clean architecture pattern for a distributed task processing service in TypeScript with worker queues and fault tolerance?'
                        )
                      }
                      className="p-1 hover:text-primary text-on-surface-variant rounded transition-colors flex items-center cursor-pointer"
                      title="Edit prompt"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="p-1 hover:text-primary text-on-surface-variant rounded transition-colors flex items-center cursor-pointer"
                      title="Fork thread"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        fork_right
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ASSISTANT TURN CONTAINER */}
              <div className="flex flex-col space-y-space-lg">
                {/* Assistant Brand Meta Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container-high flex items-center justify-center shadow-sm">
                      <img
                        alt="Nexus AI Logo"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        src={DESKTOP_LOGO_URL}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-space-xs">
                        <span className="font-label-md text-label-md font-semibold text-on-surface">
                          Nexus Core
                        </span>
                        <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Enterprise Engine
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm tabular-nums">
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      bolt
                    </span>
                    <span>482 ms to first token</span>
                  </div>
                </div>

                {/* Expandable Deep Reasoning Step */}
                {showCotStream && (
                  <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm">
                    <details className="group/reasoning cursor-pointer" open>
                      <summary className="flex items-center justify-between select-none list-none">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-6 h-6 rounded-md bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px]">
                              psychology
                            </span>
                          </div>
                          <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface font-medium">
                            <span>Thought for 3.2s</span>
                            <span className="text-outline">•</span>
                            <span className="font-label-sm text-label-sm text-outline font-normal">
                              3 synthesis phases completed
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-space-xs text-on-surface-variant group-open/reasoning:rotate-180 transition-transform duration-200">
                          <span className="material-symbols-outlined text-[18px]">
                            expand_more
                          </span>
                        </div>
                      </summary>
                      <div className="mt-space-md pt-space-sm space-y-space-sm text-on-surface-variant">
                        <div className="flex items-start gap-space-sm font-label-sm text-label-sm">
                          <span className="font-code-inline text-primary mt-0.5">01</span>
                          <div>
                            <strong className="text-on-surface">
                              Concurrency model analysis:{' '}
                            </strong>
                            <span>
                              Assessing BullMQ vs. RabbitMQ topology for strict TypeScript type contracts and distributed ACK isolation.
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-space-sm font-label-sm text-label-sm">
                          <span className="font-code-inline text-primary mt-0.5">02</span>
                          <div>
                            <strong className="text-on-surface">
                              Redis backpressure:{' '}
                            </strong>
                            <span>
                              Formulating rate limiting via sliding window algorithm, memory threshold monitoring, and automatic partition throttling.
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-space-sm font-label-sm text-label-sm">
                          <span className="font-code-inline text-primary mt-0.5">03</span>
                          <div>
                            <strong className="text-on-surface">
                              Dead-letter handling:{' '}
                            </strong>
                            <span>
                              Structuring poison-pill message quarantine, telemetry tagging, and exponential backoff jitter configurations.
                            </span>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                )}

                {/* Markdown Structured Response Body */}
                <div className="space-y-space-xl text-on-surface">
                  <p className="font-body-lg text-body-lg leading-relaxed text-on-surface">
                    To achieve enterprise resilience, we organize our distributed worker around three cleanly decoupled layers:{' '}
                    <strong>Domain Contracts</strong>, the{' '}
                    <strong>Broker Dispatch Adapter</strong>, and the{' '}
                    <strong>Idempotent Consumer Pipeline</strong>.
                  </p>

                  {/* Section 1: Architectural Pillars Grid */}
                  <div className="space-y-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        layers
                      </span>
                      <h3 className="font-headline-lg text-headline-lg text-on-surface">
                        1. Core Architectural Pillars
                      </h3>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Decoupled workers ensure high throughput by isolating ingestion from CPU-bound computation and external third-party I/O latency.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
                      <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center justify-between mb-space-xs">
                            <span className="font-label-sm text-label-sm font-code-inline text-primary">
                              01 / PRODUCER
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-outline">
                              send_and_archive
                            </span>
                          </div>
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface mb-1">
                            Queue Producer
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Enforces schema validation, injects trace IDs, and dispatches tasks to an append-only distributed log.
                          </p>
                        </div>
                        <div className="mt-space-md pt-space-xs font-label-sm text-label-sm text-outline flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                          <span>Sub-millisecond ingestion</span>
                        </div>
                      </div>

                      <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center justify-between mb-space-xs">
                            <span className="font-label-sm text-label-sm font-code-inline text-secondary">
                              02 / WORKER
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-outline">
                              memory
                            </span>
                          </div>
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface mb-1">
                            Worker Consumer
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Multi-threaded stateless daemon with preemptive heartbeat monitors, auto-scaling on queue depth.
                          </p>
                        </div>
                        <div className="mt-space-md pt-space-xs font-label-sm text-label-sm text-outline flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>
                          <span>Horizontal replicas</span>
                        </div>
                      </div>

                      <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center justify-between mb-space-xs">
                            <span className="font-label-sm text-label-sm font-code-inline text-error">
                              03 / DLQ
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-outline">
                              report
                            </span>
                          </div>
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface mb-1">
                            Dead-Letter Queue
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Quarantine vault capturing malformed payloads, unhandled edge cases, and automated telemetry alerts.
                          </p>
                        </div>
                        <div className="mt-space-md pt-space-xs font-label-sm text-label-sm text-outline flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-error inline-block"></span>
                          <span>Zero message loss</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Code Editor Artifact */}
                  <div className="space-y-space-sm pt-space-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          terminal
                        </span>
                        <h3 className="font-headline-lg text-headline-lg text-on-surface">
                          2. Production TypeScript Implementation
                        </h3>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline font-code-inline">
                        TypeScript 5.4 / Node 20 LTS
                      </span>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl">
                      {/* Code Bar Top */}
                      <div className="bg-surface-container px-space-md py-space-sm flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-surface-container-highest inline-block"></span>
                            <span className="w-3 h-3 rounded-full bg-surface-container-highest inline-block"></span>
                            <span className="w-3 h-3 rounded-full bg-surface-container-highest inline-block"></span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-2 font-code-inline text-code-inline text-on-surface font-medium">
                            <span className="material-symbols-outlined text-primary text-[16px]">
                              data_object
                            </span>
                            <span>worker-service.ts</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-space-xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyCode('main-worker-code', WORKER_SERVICE_CODE)
                            }
                            className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-code-inline text-code-inline transition-colors cursor-pointer"
                          >
                            {copiedCodeId === 'main-worker-code' ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  check
                                </span>
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[16px]">
                                  content_copy
                                </span>
                                <span>Copy code</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      {/* Code Body */}
                      <pre className="p-space-lg font-code-block text-code-block overflow-x-auto text-on-surface leading-loose select-text">
                        <code>
                          <span className="text-secondary font-medium">import</span> {'{ '}
                          <span className="text-tertiary">Worker</span>,{' '}
                          <span className="text-tertiary">Queue</span>,{' '}
                          <span className="text-tertiary">Job</span> {'} '}
                          <span className="text-secondary font-medium">from</span>{' '}
                          <span className="text-primary-fixed-dim">&apos;bullmq&apos;</span>;
                          {'\n'}
                          <span className="text-secondary font-medium">import</span> {'{ '}
                          <span className="text-tertiary">RedisConnection</span> {'} '}
                          <span className="text-secondary font-medium">from</span>{' '}
                          <span className="text-primary-fixed-dim">
                            &apos;./infrastructure/redis&apos;
                          </span>
                          ;{'\n\n'}
                          <span className="text-secondary font-medium">
                            export interface
                          </span>{' '}
                          <span className="text-tertiary">TaskPayload</span> {'{\n'}
                          {'  '}
                          <span className="text-secondary font-medium">readonly</span>{' '}
                          taskId: <span className="text-tertiary">string</span>;{'\n'}
                          {'  '}
                          <span className="text-secondary font-medium">readonly</span>{' '}
                          entityId: <span className="text-tertiary">string</span>;{'\n'}
                          {'  '}
                          <span className="text-secondary font-medium">readonly</span>{' '}
                          attempts: <span className="text-tertiary">number</span>;{'\n'}
                          {'}\n\n'}
                          <span className="text-secondary font-medium">
                            export class
                          </span>{' '}
                          <span className="text-tertiary">DistributedTaskProcessor</span>{' '}
                          {'{\n'}
                          {'  '}
                          <span className="text-secondary font-medium">private</span>{' '}
                          worker: <span className="text-tertiary">Worker</span>&lt;
                          <span className="text-tertiary">TaskPayload</span>&gt;;{'\n\n'}
                          {'  '}
                          <span className="text-secondary font-medium">constructor</span>(
                          <span className="text-secondary font-medium">
                            private readonly
                          </span>{' '}
                          redis: <span className="text-tertiary">RedisConnection</span>){' '}
                          {'{\n'}
                          {'    '}
                          <span className="text-secondary font-medium">this</span>.worker ={' '}
                          <span className="text-secondary font-medium">new</span>{' '}
                          <span className="text-tertiary">Worker</span>&lt;
                          <span className="text-tertiary">TaskPayload</span>&gt;({'\n'}
                          {'      '}
                          <span className="text-primary-fixed-dim">
                            &apos;critical-tasks&apos;
                          </span>
                          ,{'\n'}
                          {'      '}
                          <span className="text-secondary font-medium">async</span> (job:{' '}
                          <span className="text-tertiary">Job</span>&lt;
                          <span className="text-tertiary">TaskPayload</span>&gt;) =&gt;{' '}
                          <span className="text-secondary font-medium">this</span>
                          .handleJob(job),{'\n'}
                          {'      {\n'}
                          {'        '}connection:{' '}
                          <span className="text-secondary font-medium">this</span>
                          .redis.getClient(),{'\n'}
                          {'        '}concurrency: <span className="text-primary">20</span>,
                          {'\n'}
                          {'        '}limiter: {'{ '}max:{' '}
                          <span className="text-primary">100</span>, duration:{' '}
                          <span className="text-primary">1000</span> {'}'},{'\n'}
                          {'      }\n'}
                          {'    );\n\n'}
                          {'    '}
                          <span className="text-secondary font-medium">this</span>
                          .bindTelemetry();{'\n'}
                          {'  }\n\n'}
                          {'  '}
                          <span className="text-secondary font-medium">
                            private async
                          </span>{' '}
                          handleJob(job: <span className="text-tertiary">Job</span>&lt;
                          <span className="text-tertiary">TaskPayload</span>&gt;):{' '}
                          <span className="text-tertiary">Promise</span>&lt;
                          <span className="text-secondary font-medium">void</span>&gt;{' '}
                          {'{\n'}
                          {'    '}
                          <span className="text-outline">
                            // Distributed Idempotency Lock
                          </span>
                          {'\n'}
                          {'    '}
                          <span className="text-secondary font-medium">const</span>{' '}
                          isAcquired ={' '}
                          <span className="text-secondary font-medium">await</span>{' '}
                          <span className="text-secondary font-medium">this</span>
                          .redis.set({'\n'}
                          {'      '}
                          <span className="text-primary-fixed-dim">
                            {'`idempotency:${job.data.taskId}`'}
                          </span>
                          ,{'\n'}
                          {'      '}
                          <span className="text-primary-fixed-dim">
                            &apos;LOCKED&apos;
                          </span>
                          ,{'\n'}
                          {'      '}
                          <span className="text-primary-fixed-dim">&apos;EX&apos;</span>,
                          {'\n'}
                          {'      '}
                          <span className="text-primary">3600</span>,{'\n'}
                          {'      '}
                          <span className="text-primary-fixed-dim">&apos;NX&apos;</span>
                          {'\n'}
                          {'    );\n\n'}
                          {'    '}
                          <span className="text-secondary font-medium">if</span>{' '}
                          (!isAcquired){' '}
                          <span className="text-secondary font-medium">return</span>;{' '}
                          <span className="text-outline">
                            // Prevent redundant concurrent executions
                          </span>
                          {'\n\n'}
                          {'    '}
                          <span className="text-secondary font-medium">await</span>{' '}
                          <span className="text-secondary font-medium">this</span>
                          .processWithRetry(job.data);{'\n'}
                          {'  }\n'}
                          {'}'}
                        </code>
                      </pre>
                    </div>
                  </div>

                  {/* Section 3: Reliability Checklist Visual Cards */}
                  <div className="space-y-space-sm pt-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        verified_user
                      </span>
                      <h3 className="font-headline-lg text-headline-lg text-on-surface">
                        3. Key Reliability Guarantees
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                      <div className="flex items-start gap-space-md p-space-md bg-surface-container rounded-xl shadow-sm">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            history
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface">
                            Exponential Backoff &amp; Jitter
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Avoid thundering herd problems with randomized jitter:{' '}
                            <code>t = base * 2^attempt + rand(0, 100ms)</code>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-space-md p-space-md bg-surface-container rounded-xl shadow-sm">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            key
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface">
                            Deterministic Idempotency
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Payload hashing (SHA-256) establishes a deduplication barrier before state mutation occurs.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-space-md p-space-md bg-surface-container rounded-xl shadow-sm">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            monitor_heart
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface">
                            Active Stall Health Checks
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Workers emit continuous heartbeats. Unresponsive lock holders automatically release claimed tasks.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-space-md p-space-md bg-surface-container rounded-xl shadow-sm">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            emergency
                          </span>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-title-md text-title-md font-semibold text-on-surface">
                            Circuit Breaker Tripwire
                          </h4>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            Pause consumers when downstream databases cross 90% connection saturation or drop queries.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assistant Message Action Bar */}
                  <div className="pt-space-md flex items-center justify-between text-outline">
                    <div className="flex items-center gap-space-xs">
                      <button
                        type="button"
                        onClick={handleCopyFullResponse}
                        className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
                        title="Copy full response"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedFullResponse ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedFullResponse ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playHapticFeedback(audioStyle, 'major');
                          triggerToast(
                            `Regenerating with ${activeModel.name} (${promptBudget.toLocaleString()} reasoning tokens)...`
                          );
                        }}
                        className="flex items-center gap-1.5 px-space-sm py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
                        title="Regenerate"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          refresh
                        </span>
                        <span>Regenerate</span>
                      </button>
                      <div className="h-4 w-px bg-surface-container-highest mx-space-2xs"></div>
                      <button
                        type="button"
                        onClick={() => {
                          setLikedState((s) => (s === 'up' ? null : 'up'));
                          triggerToast('Feedback recorded: Helpful response');
                        }}
                        className={`p-1.5 rounded-lg hover:bg-surface-container hover:text-primary transition-colors cursor-pointer ${
                          likedState === 'up' ? 'text-primary' : ''
                        }`}
                        title="Good response"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          thumb_up
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLikedState((s) => (s === 'down' ? null : 'down'));
                          triggerToast('Feedback recorded');
                        }}
                        className={`p-1.5 rounded-lg hover:bg-surface-container hover:text-error transition-colors cursor-pointer ${
                          likedState === 'down' ? 'text-error' : ''
                        }`}
                        title="Poor response"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          thumb_down
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerToast('Share snapshot created')}
                        className="p-1.5 rounded-lg hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                        title="Share answer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          share
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-space-xs font-label-sm text-label-sm tabular-nums">
                      <span className="material-symbols-outlined text-[14px]">speed</span>
                      <span>{activeModel.metrics.speed}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC FOLLOW-UP TURNS */}
              {followUpTurns.map((turn) => (
                <React.Fragment key={turn.id}>
                  {/* User Follow-up Bubble */}
                  <div className="flex flex-col items-end group pt-4">
                    <div className="flex items-center gap-space-sm mb-space-xs">
                      <span className="font-label-sm text-label-sm text-outline tabular-nums">
                        {turn.userTime}
                      </span>
                      <span className="font-label-sm text-label-sm font-medium text-on-surface">
                        Alex Morgan
                      </span>
                    </div>
                    <div className="relative max-w-2xl bg-surface-container-high text-on-surface rounded-2xl rounded-tr-sm p-space-lg shadow-md">
                      <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                        {turn.userPrompt}
                      </p>
                    </div>
                  </div>

                  {/* Assistant Follow-up Response */}
                  <div className="flex flex-col space-y-space-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container-high flex items-center justify-center shadow-sm">
                          <img
                            alt="Nexus AI Logo"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            src={DESKTOP_LOGO_URL}
                          />
                        </div>
                        <div className="flex items-center gap-space-xs">
                          <span className="font-label-md text-label-md font-semibold text-on-surface">
                            Nexus Core
                          </span>
                          <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {activeModel.shortName} •{' '}
                            {(turn.reasoningBudgetUsed / 1024).toFixed(0)}k CoT
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-space-xs text-outline font-label-sm text-label-sm tabular-nums">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          bolt
                        </span>
                        <span>{turn.ttft} to first token</span>
                      </div>
                    </div>

                    {promptStreamCot && (
                      <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm">
                        <details className="group/reasoning cursor-pointer" open>
                          <summary className="flex items-center justify-between select-none list-none">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-6 h-6 rounded-md bg-tertiary-container/20 text-tertiary flex items-center justify-center">
                                <span className="material-symbols-outlined text-[15px]">
                                  psychology
                                </span>
                              </div>
                              <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface font-medium">
                                <span>Thought for {turn.thoughtTime}</span>
                                <span className="text-outline">•</span>
                                <span className="font-label-sm text-label-sm text-outline font-normal">
                                  {turn.thoughtPhases.length} synthesis phases completed
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-space-xs text-on-surface-variant group-open/reasoning:rotate-180 transition-transform duration-200">
                              <span className="material-symbols-outlined text-[18px]">
                                expand_more
                              </span>
                            </div>
                          </summary>
                          <div className="mt-space-md pt-space-sm space-y-space-sm text-on-surface-variant">
                            {turn.thoughtPhases.map((phase) => (
                              <div
                                key={phase.num}
                                className="flex items-start gap-space-sm font-label-sm text-label-sm"
                              >
                                <span className="font-code-inline text-primary mt-0.5">
                                  {phase.num}
                                </span>
                                <div>
                                  <strong className="text-on-surface">
                                    {phase.title}{' '}
                                  </strong>
                                  <span>{phase.detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}

                    <div className="space-y-space-md text-on-surface">
                      <p className="font-body-lg text-body-lg leading-relaxed">
                        {turn.intro}
                      </p>
                      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-surface-container px-space-md py-space-sm flex items-center justify-between">
                          <div className="flex items-center gap-space-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full bg-surface-container-highest inline-block"></span>
                              <span className="w-3 h-3 rounded-full bg-surface-container-highest inline-block"></span>
                              <span className="w-3 h-3 rounded-full bg-surface-container-highest inline-block"></span>
                            </div>
                            <div className="flex items-center gap-1.5 pl-2 font-code-inline text-code-inline text-on-surface font-medium">
                              <span className="material-symbols-outlined text-primary text-[16px]">
                                data_object
                              </span>
                              <span>{turn.codeFile}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(turn.id, turn.codeContent)}
                            className="flex items-center gap-1 px-space-sm py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-code-inline text-code-inline transition-colors cursor-pointer"
                          >
                            {copiedCodeId === turn.id ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  check
                                </span>
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[16px]">
                                  content_copy
                                </span>
                                <span>Copy code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-space-lg font-code-block text-code-block overflow-x-auto text-on-surface leading-loose select-text">
                          <code>{turn.codeContent}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}

              <div ref={chatEndRef} />
            </div>

            {/* FLOATING COMPOSER DOCK (STICKY FOOTER) */}
            <div
              className={`fixed bottom-0 ${
                sidebarOpen ? 'lg:left-64 left-0' : 'left-0'
              } right-0 z-40 bg-gradient-to-t from-surface via-surface/95 to-transparent pt-space-lg pb-space-md px-gutter-md transition-all duration-200`}
            >
              <div className="max-w-4xl mx-auto flex flex-col space-y-space-sm">
                {/* Suggestion Chips Rail */}
                <div className="flex items-center gap-space-sm overflow-x-auto no-scrollbar py-0.5">
                  {[
                    {
                      label: 'Add Retry Circuit Breaker',
                      icon: 'bolt',
                      iconColor: 'text-primary group-hover:rotate-45 transition-transform',
                    },
                    {
                      label: 'Generate Docker Compose',
                      icon: 'terminal',
                      iconColor: 'text-secondary',
                    },
                    {
                      label: 'Add Unit Tests',
                      icon: 'bug_report',
                      iconColor: 'text-tertiary',
                    },
                    {
                      label: 'Benchmark Throughput',
                      icon: 'speed',
                      iconColor: 'text-outline',
                    },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleSubmitPrompt(chip.label)}
                      className="shrink-0 flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors group cursor-pointer whitespace-nowrap"
                    >
                      <span
                        className={`material-symbols-outlined text-[15px] ${chip.iconColor}`}
                      >
                        {chip.icon}
                      </span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>

                {/* Composer Capsule Container */}
                <div className="relative bg-surface-container-high rounded-2xl p-space-md shadow-2xl flex flex-col gap-space-sm focus-within:bg-surface-container-highest transition-colors">
                  {/* Input Textarea */}
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitPrompt();
                      }
                    }}
                    className="w-full bg-transparent text-on-surface placeholder:text-outline font-body-md text-body-md resize-none focus:outline-none"
                    placeholder="Ask follow-up questions, upload architecture diagrams, or type / for commands..."
                    rows={2}
                  />

                  {/* Bottom Toolbar Row */}
                  <div className="flex items-center justify-between pt-1">
                    {/* Left Capabilities Cluster */}
                    <div className="flex items-center gap-space-xs">
                      <button
                        type="button"
                        onClick={() => triggerToast('Architecture diagram attachment ready')}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                        title="Attach file or diagram"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          attach_file
                        </span>
                      </button>

                      {/* Toggle Web Search */}
                      <button
                        type="button"
                        onClick={() => {
                          playHapticFeedback(audioStyle, 'subtle', 1050);
                          setWebSearchEnabled((w) => !w);
                        }}
                        className={`flex items-center gap-1.5 px-space-sm py-1 rounded-lg transition-colors font-label-md text-label-md cursor-pointer whitespace-nowrap ${
                          webSearchEnabled
                            ? 'bg-surface-container text-on-surface hover:bg-surface-container-highest'
                            : 'bg-surface-container/50 text-outline hover:text-on-surface-variant'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            webSearchEnabled ? 'text-secondary' : 'text-outline'
                          }`}
                        >
                          public
                        </span>
                        <span className="hidden sm:inline">Web search</span>
                      </button>

                      {/* Toggle Deep Reasoning with Micro-Haptics Popover */}
                      <PromptReasoningPopover
                        isOpen={popoverOpen}
                        onToggleOpen={() => setPopoverOpen((o) => !o)}
                        budget={promptBudget}
                        onChangeBudget={setPromptBudget}
                        audioStyle={audioStyle}
                        onChangeAudioStyle={setAudioStyle}
                        streamCot={promptStreamCot}
                        onToggleStreamCot={() => setPromptStreamCot((s) => !s)}
                        autoVerify={promptAutoVerify}
                        onToggleAutoVerify={() => setPromptAutoVerify((a) => !a)}
                        variant={popoverVariant}
                      />
                    </div>

                    {/* Right Action Tools */}
                    <div className="flex items-center gap-space-sm">
                      <button
                        type="button"
                        onClick={() => triggerToast('Voice transcription active')}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                        title="Voice input"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          mic
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitPrompt()}
                        className="w-9 h-9 rounded-full bg-primary text-on-primary hover:bg-primary-fixed transition-colors flex items-center justify-center shadow-md cursor-pointer"
                        title="Send query"
                      >
                        <span className="material-symbols-outlined text-[20px] font-bold">
                          arrow_upward
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legal & Reliability Disclaimer */}
                <div className="text-center">
                  <p className="font-label-sm text-label-sm text-outline">
                    Nexus AI may produce inaccurate information about people, places, or facts.{' '}
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        triggerToast('Enterprise Privacy & Security SLA active');
                      }}
                      className="underline hover:text-on-surface-variant transition-colors cursor-pointer"
                      href="#privacy"
                    >
                      Privacy Policy &amp; Terms
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Sheet 1: Select Model */}
      {showModelSheetModal && (
        <SelectModelSheet
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          reasoningEffort={sessionEffort}
          onChangeReasoningEffort={setSessionEffort}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled((v) => !v)}
          codeSandboxEnabled={codeSandboxEnabled}
          onToggleCodeSandbox={() => setCodeSandboxEnabled((v) => !v)}
          onClose={() => setShowModelSheetModal(false)}
          audioStyle={audioStyle}
          standaloneMobileFrame={false}
        />
      )}

      {/* Modal Sheet 2: Reasoning Effort & Thinking */}
      {showReasoningSheetModal && (
        <ReasoningEffortSheet
          selectedModelId={selectedModelId}
          tokenBudget={sessionTokenBudget}
          onChangeTokenBudget={(val) => {
            setSessionTokenBudget(val);
            setPromptBudget(val);
          }}
          stepVerification={stepVerification}
          onToggleStepVerification={() => setStepVerification((v) => !v)}
          showCotStream={showCotStream}
          onToggleShowCotStream={() => setShowCotStream((v) => !v)}
          deepBranchPruning={deepBranchPruning}
          onToggleDeepBranchPruning={() => setDeepBranchPruning((v) => !v)}
          onClose={() => setShowReasoningSheetModal(false)}
          audioStyle={audioStyle}
          standaloneMobileFrame={false}
        />
      )}
    </div>
  );
}
