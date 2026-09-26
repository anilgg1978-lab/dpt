import React, { useState } from 'react';
import { MOBILE_LOGO_URL, MODEL_OPTIONS } from '../data/mockData';
import { playHapticFeedback, AudioStyle } from '../utils/haptics';

interface ReasoningEffortSheetProps {
  selectedModelId: string;
  tokenBudget: number;
  onChangeTokenBudget: (val: number) => void;
  stepVerification: boolean;
  onToggleStepVerification: () => void;
  showCotStream: boolean;
  onToggleShowCotStream: () => void;
  deepBranchPruning: boolean;
  onToggleDeepBranchPruning: () => void;
  onClose: () => void;
  onNavigateTab?: (tab: 'chat' | 'prompts' | 'artifacts' | 'config') => void;
  audioStyle: AudioStyle;
  standaloneMobileFrame?: boolean;
}

export const ReasoningEffortSheet: React.FC<ReasoningEffortSheetProps> = ({
  selectedModelId,
  tokenBudget,
  onChangeTokenBudget,
  stepVerification,
  onToggleStepVerification,
  showCotStream,
  onToggleShowCotStream,
  deepBranchPruning,
  onToggleDeepBranchPruning,
  onClose,
  onNavigateTab,
  audioStyle,
  standaloneMobileFrame = false,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);

  const activePreset: 'low' | 'medium' | 'high' =
    tokenBudget <= 6144 ? 'low' : tokenBudget <= 18432 ? 'medium' : 'high';

  const handleSelectPreset = (preset: 'low' | 'medium' | 'high') => {
    playHapticFeedback(audioStyle, 'preset');
    if (preset === 'low') onChangeTokenBudget(4096);
    else if (preset === 'medium') onChangeTokenBudget(16384);
    else onChangeTokenBudget(24576);
  };

  const handleReset = () => {
    playHapticFeedback(audioStyle, 'major');
    onChangeTokenBudget(16384);
  };

  const handleSave = () => {
    playHapticFeedback(audioStyle, 'major');
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  // Dynamic benchmark projections based on tokenBudget
  const estCost = (tokenBudget * 0.000001).toFixed(3);
  const estTtft =
    activePreset === 'low' ? '~1.4s' : activePreset === 'medium' ? '~3.1s' : '~4.2s';
  const estAccuracy =
    activePreset === 'low' ? '81.2%' : activePreset === 'medium' ? '90.4%' : '94.8%';
  const estAccuracyDelta =
    activePreset === 'low' ? 'Baseline' : activePreset === 'medium' ? '+11% vs Low' : '+18% vs Low';
  const estLoad =
    activePreset === 'low' ? 'Light' : activePreset === 'medium' ? 'Moderate' : 'Heavy';
  const windowK = `${Math.round(tokenBudget / 1024)}k window`;
  const branchLevel = Math.max(2, Math.min(6, Math.round((tokenBudget / 32768) * 6) + 1));

  const activeModelObj = MODEL_OPTIONS.find((m) => m.id === selectedModelId) || MODEL_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
      {standaloneMobileFrame && (
        <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-16 px-gutter flex items-center justify-between gap-space-sm max-w-xl mx-auto">
            <div className="flex items-center gap-space-sm min-w-0">
              <button
                onClick={onClose}
                aria-label="Open Chat History Drawer"
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">menu</span>
              </button>
              <div className="flex items-center gap-space-xs">
                <img
                  alt="Nexus Brand Logo"
                  referrerPolicy="no-referrer"
                  className="h-8 w-auto object-contain"
                  src={MOBILE_LOGO_URL}
                />
                <span className="font-title-md text-title-md text-on-surface tracking-tight truncate hidden sm:inline">
                  Nexus
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center px-space-xs">
              <span className="font-label-md text-label-md text-on-surface font-medium truncate max-w-[130px]">
                Chat Workspace
              </span>
              <div className="flex items-center gap-1 px-space-xs py-0.5 rounded-full bg-primary/10 text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-label-sm tracking-wide">
                  {activeModelObj.shortName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                onClick={onClose}
                aria-label="Start New Chat"
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add_comment</span>
              </button>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[18px]">
                  person
                </span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Modal Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-40 transition-opacity"
      />

      {/* Reasoning Effort Detail Bottom Sheet */}
      <div
        className={`relative z-50 flex flex-col w-full max-w-xl mx-auto rounded-t-3xl bg-surface-container shadow-2xl overflow-hidden ${
          standaloneMobileFrame ? 'max-h-[calc(100dvh-136px)] mb-20' : 'max-h-[88dvh]'
        }`}
      >
        {/* Top Grab Bar & Header */}
        <div className="px-gutter pt-3 pb-space-sm flex flex-col items-center shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-surface-container-highest mb-3"></div>
          <div className="w-full flex items-start justify-between gap-space-md">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs flex-wrap">
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-semibold tracking-tight">
                  Reasoning Effort &amp; Thinking
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-label-sm text-label-sm whitespace-nowrap">
                  <span
                    className="material-symbols-outlined text-[13px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    psychology
                  </span>
                  R1 Engine
                </span>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant mt-1 leading-snug">
                Configure chain-of-thought depth, budget allocation, and step verification for complex reasoning.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Dismiss Modal"
              className="w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Configuration Content Body */}
        <div className="px-gutter space-y-space-xl overflow-y-auto pb-space-xl flex-1">
          {/* Preset Selector: 3-way Segmented Cards */}
          <section className="space-y-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Reasoning Preset
              </span>
              <span className="font-label-sm text-label-sm text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Dynamic Heuristics
              </span>
            </div>

            <div className="grid grid-cols-1 gap-space-xs">
              {/* Low Card */}
              <div
                onClick={() => handleSelectPreset('low')}
                className={`cursor-pointer p-space-md rounded-xl transition-all flex items-start justify-between gap-space-sm relative overflow-hidden ${
                  activePreset === 'low'
                    ? 'bg-surface-container-high shadow-md'
                    : 'bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                {activePreset === 'low' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                )}
                <div className={`space-y-1 min-w-0 flex-1 ${activePreset === 'low' ? 'pl-1' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-label-md text-label-md font-semibold ${
                        activePreset === 'low' ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      Low
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-highest whitespace-nowrap">
                      ~1k-4k tokens
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      1-2s TTFT
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                    Streamlined logic for rapid responses, casual inquiries, and low-latency dialogues.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    activePreset === 'low' ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  {activePreset === 'low' && (
                    <span className="material-symbols-outlined text-on-primary text-[14px] font-bold">
                      check
                    </span>
                  )}
                </div>
              </div>

              {/* Medium Card */}
              <div
                onClick={() => handleSelectPreset('medium')}
                className={`cursor-pointer p-space-md rounded-xl transition-all flex items-start justify-between gap-space-sm relative overflow-hidden ${
                  activePreset === 'medium'
                    ? 'bg-surface-container-high shadow-md'
                    : 'bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                {activePreset === 'medium' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                )}
                <div
                  className={`space-y-1 min-w-0 flex-1 ${activePreset === 'medium' ? 'pl-1' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-label-md text-label-md font-semibold ${
                        activePreset === 'medium' ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      Medium
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant px-1.5 py-0.5 rounded bg-surface-container-highest whitespace-nowrap">
                      ~8k-16k tokens
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      3-5s TTFT
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                    Balanced multi-step reasoning optimal for codebase refactoring, synthesis, and debugging.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    activePreset === 'medium' ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  {activePreset === 'medium' && (
                    <span className="material-symbols-outlined text-on-primary text-[14px] font-bold">
                      check
                    </span>
                  )}
                </div>
              </div>

              {/* High / Deep Think Card */}
              <div
                onClick={() => handleSelectPreset('high')}
                className={`cursor-pointer p-space-md rounded-xl relative overflow-hidden transition-all flex items-start justify-between gap-space-sm ${
                  activePreset === 'high'
                    ? 'bg-surface-container-high shadow-md'
                    : 'bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                {activePreset === 'high' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                )}
                <div className={`space-y-1 min-w-0 flex-1 ${activePreset === 'high' ? 'pl-1' : ''}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-label-md text-label-md font-semibold flex items-center gap-1.5 ${
                        activePreset === 'high' ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                      High / Deep Think
                    </span>
                    <span className="font-label-sm text-label-sm text-primary bg-primary/20 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                      Up to 32k tokens
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary">Tree Search</span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
                    Exhaustive multi-branch exploration, formal proof checks, and self-correction for distributed architectures.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    activePreset === 'high' ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  {activePreset === 'high' && (
                    <span className="material-symbols-outlined text-on-primary text-[14px] font-bold">
                      check
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Granular Fine-Tuning Module */}
          <section className="space-y-space-md">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Granular Allocation
              </span>
              <span className="font-label-sm text-label-sm text-secondary-fixed-dim">
                Strict Enforcement
              </span>
            </div>

            {/* Slider Card */}
            <div className="p-space-md rounded-xl bg-surface-container-low space-y-space-sm">
              <div className="flex items-center justify-between text-on-surface">
                <span className="font-label-md text-label-md font-medium">Max Thinking Budget</span>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="font-code-block text-code-block text-primary font-medium">
                    {tokenBudget.toLocaleString()}
                  </span>
                  <span className="font-code-block text-[11px] text-on-surface-variant">
                    / 32,768 Tokens
                  </span>
                </div>
              </div>

              <div className="relative py-1">
                <input
                  aria-label="Max Thinking Budget"
                  className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  max={32768}
                  min={1024}
                  step={1024}
                  type="range"
                  value={tokenBudget}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const dynamicPitch = 820 + (val / 32768) * 380;
                    playHapticFeedback(audioStyle, 'subtle', dynamicPitch);
                    onChangeTokenBudget(val);
                  }}
                />
              </div>

              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                <span>Min: 1,024</span>
                <span className="flex items-center gap-1 text-primary-fixed-dim">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  Est. ~${estCost} / query
                </span>
                <span>Max: 32,768</span>
              </div>
            </div>

            {/* Toggle Controls Stack */}
            <div className="rounded-xl bg-surface-container-low overflow-hidden">
              {/* Toggle 1: Step Verification */}
              <div className="p-space-md flex items-start justify-between gap-space-md bg-surface-container-low">
                <div className="space-y-0.5 flex-1 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Step Verification &amp; Self-Correction
                    </span>
                    <span className="material-symbols-outlined text-primary text-[15px]">
                      verified
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
                    Verify intermediate reasoning steps before emitting output tokens. Detects logical fallacies early.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={stepVerification}
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 1080);
                    onToggleStepVerification();
                  }}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 self-center cursor-pointer ${
                    stepVerification ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-surface-container-lowest absolute top-0.5 transition-all duration-200 shadow ${
                      stepVerification ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-surface-container-high mx-space-md"></div>

              {/* Toggle 2: Show CoT in Stream */}
              <div className="p-space-md flex items-start justify-between gap-space-md bg-surface-container-low">
                <div className="space-y-0.5 flex-1 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Show CoT in Stream
                    </span>
                    <span className="material-symbols-outlined text-secondary text-[15px]">
                      visibility
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
                    Display full collapsible &quot;Thought for Xs&quot; reasoning trace directly in message responses.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showCotStream}
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 1020);
                    onToggleShowCotStream();
                  }}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 self-center cursor-pointer ${
                    showCotStream ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-surface-container-lowest absolute top-0.5 transition-all duration-200 shadow ${
                      showCotStream ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-surface-container-high mx-space-md"></div>

              {/* Toggle 3: Deep Branch Pruning */}
              <div className="p-space-md flex items-start justify-between gap-space-md bg-surface-container-low">
                <div className="space-y-0.5 flex-1 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Deep Branch Pruning (Tree Search)
                    </span>
                    <span className="material-symbols-outlined text-tertiary text-[15px]">
                      account_tree
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
                    Executes multi-path hypothesis testing and discards dead-ends prior to answer generation.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={deepBranchPruning}
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 960);
                    onToggleDeepBranchPruning();
                  }}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 self-center cursor-pointer ${
                    deepBranchPruning ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-surface-container-lowest absolute top-0.5 transition-all duration-200 shadow ${
                      deepBranchPruning ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Real-Time Benchmark / Impact Preview Card */}
          <section className="space-y-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Benchmark Projection
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                GSM8k • HumanEval
              </span>
            </div>

            <div className="p-space-md rounded-2xl bg-surface-container-low space-y-space-md shadow-inner tabular-nums">
              <div className="grid grid-cols-3 gap-space-xs">
                {/* Metric 1: Latency */}
                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[14px]">timer</span>
                    <span>TTFT</span>
                  </div>
                  <div className="mt-2">
                    <span className="font-title-md text-title-md font-semibold text-secondary-fixed-dim">
                      {estTtft}
                    </span>
                    <span className="block font-label-sm text-[10px] text-on-surface-variant leading-tight">
                      Avg first token
                    </span>
                  </div>
                </div>

                {/* Metric 2: Accuracy */}
                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-primary text-[14px]">
                      insights
                    </span>
                    <span>Accuracy</span>
                  </div>
                  <div className="mt-2">
                    <span className="font-title-md text-title-md font-semibold text-primary">
                      {estAccuracy}
                    </span>
                    <span className="inline-block font-label-sm text-[10px] text-primary bg-primary/10 px-1 rounded font-medium mt-0.5">
                      {estAccuracyDelta}
                    </span>
                  </div>
                </div>

                {/* Metric 3: Context Load */}
                <div className="p-space-sm rounded-xl bg-surface-container flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[14px]">memory</span>
                    <span>Load</span>
                  </div>
                  <div className="mt-2">
                    <span className="font-title-md text-title-md font-semibold text-on-surface">
                      {estLoad}
                    </span>
                    <span className="block font-label-sm text-[10px] text-on-surface-variant leading-tight">
                      {windowK}
                    </span>
                  </div>
                </div>
              </div>

              {/* Micro Sparkline / Visual Trace */}
              <div className="flex items-center justify-between pt-1 text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">hub</span>
                  CoT Branch Depth: Level {branchLevel}
                </span>
                <div className="flex items-center gap-1">
                  {[3, 4, 6, 5, 7, 4].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h * 4}px` }}
                      className={`w-1.5 rounded-sm transition-colors ${
                        i < branchLevel ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Action Footer */}
        <div className="px-gutter pt-space-sm pb-space-sm bg-surface-container space-y-space-xs shrink-0">
          <div className="flex items-center gap-space-sm">
            <button
              onClick={handleReset}
              className="min-h-[44px] px-space-md py-space-sm rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright active:scale-95 transition-all font-label-md text-label-md font-medium shrink-0 cursor-pointer"
              type="button"
            >
              Reset Default
            </button>
            <button
              onClick={handleSave}
              className={`flex-1 min-h-[44px] px-space-lg py-space-sm rounded-xl text-on-primary active:scale-98 transition-all flex items-center justify-center gap-space-xs shadow-lg font-label-md text-label-md font-semibold cursor-pointer ${
                saveSuccess ? 'bg-secondary' : 'bg-primary hover:bg-primary-fixed-dim'
              }`}
              type="button"
            >
              {saveSuccess ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Profile Applied!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span>Save Reasoning Profile</span>
                </>
              )}
            </button>
          </div>
          <div className="text-center">
            <p className="font-label-sm text-[11px] text-on-surface-variant/80">
              Applied to current session:{' '}
              <span className="font-code-block text-[11px] text-primary">arch-review/v3.4</span> • Overridable per prompt
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Mobile Navigation Bar when in standaloneMobileFrame */}
      {standaloneMobileFrame && (
        <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="h-20 px-gutter flex items-center justify-around max-w-xl mx-auto">
            <button
              onClick={() => onNavigateTab?.('chat')}
              className="min-w-[44px] min-h-[44px] px-space-md py-space-xs rounded-xl flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
              <span className="font-label-sm text-label-sm mt-0.5">Chat</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('prompts')}
              className="min-w-[44px] min-h-[44px] px-space-md py-space-xs rounded-xl flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">lightbulb</span>
              <span className="font-label-sm text-label-sm mt-0.5">Prompts</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('artifacts')}
              className="min-w-[44px] min-h-[44px] px-space-md py-space-xs rounded-xl flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">code_blocks</span>
              <span className="font-label-sm text-label-sm mt-0.5">Artifacts</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('config')}
              className="min-w-[44px] min-h-[44px] px-space-md py-space-xs rounded-xl flex flex-col items-center justify-center text-primary bg-surface-container-high transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">tune</span>
              <span className="font-label-sm text-label-sm mt-0.5">Config</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};
