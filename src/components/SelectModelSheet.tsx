import React, { useState } from 'react';
import { MODEL_OPTIONS, MOBILE_LOGO_URL } from '../data/mockData';
import { playHapticFeedback, AudioStyle } from '../utils/haptics';

interface SelectModelSheetProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  reasoningEffort: 'Low' | 'Medium' | 'High';
  onChangeReasoningEffort: (effort: 'Low' | 'Medium' | 'High') => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  codeSandboxEnabled: boolean;
  onToggleCodeSandbox: () => void;
  onClose: () => void;
  onNavigateTab?: (tab: 'chat' | 'prompts' | 'artifacts' | 'config') => void;
  audioStyle: AudioStyle;
  standaloneMobileFrame?: boolean;
}

export const SelectModelSheet: React.FC<SelectModelSheetProps> = ({
  selectedModelId,
  onSelectModel,
  reasoningEffort,
  onChangeReasoningEffort,
  webSearchEnabled,
  onToggleWebSearch,
  codeSandboxEnabled,
  onToggleCodeSandbox,
  onClose,
  onNavigateTab,
  audioStyle,
  standaloneMobileFrame = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'reasoning' | 'fast' | 'swe'>('all');
  const [isApplying, setIsApplying] = useState(false);

  const filteredModels = MODEL_OPTIONS.filter((m) => {
    if (activeFilter === 'all') return true;
    return m.category === activeFilter;
  });

  const effortLabelText =
    reasoningEffort === 'Low'
      ? 'Low (Speed Prioritized)'
      : reasoningEffort === 'High'
        ? 'High (Deep Dive Trace)'
        : 'Balanced (Medium)';

  const handleApply = () => {
    playHapticFeedback(audioStyle, 'major');
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      onClose();
    }, 450);
  };

  const activeModelObj = MODEL_OPTIONS.find((m) => m.id === selectedModelId) || MODEL_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end items-center">
      {/* If in standalone mobile preview mode, render the mobile top bar & blurred C++20 backdrop from Screen 1 */}
      {standaloneMobileFrame && (
        <>
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

          {/* Simulated Inactive Chat Backdrop (Dimmed & Blurred Workspace) */}
          <div className="fixed inset-0 pt-20 px-gutter max-w-xl mx-auto opacity-35 filter blur-[2px] pointer-events-none select-none flex flex-col gap-space-lg z-30">
            <div className="flex justify-end">
              <div className="bg-surface-container-high text-on-surface rounded-[18px] rounded-br-[4px] px-space-md py-space-sm max-w-[85%]">
                <p className="font-body-md text-body-md leading-relaxed">
                  Can you implement a lock-free ring buffer queue in C++20 with atomic head/tail indices?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-space-sm max-w-[95%]">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  auto_awesome
                </span>
              </div>
              <div className="flex flex-col gap-space-xs flex-1">
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md text-on-surface font-medium">
                    Nexus Assistant
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    GPT-4o
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Certainly. Below is a cache-aligned, single-producer single-consumer (SPSC) bounded queue leveraging{' '}
                  <code className="font-code-inline text-code-inline text-primary">
                    std::atomic
                  </code>{' '}
                  with acquire-release memory orderings to prevent false sharing...
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Backdrop Scrim Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-surface-container-lowest/75 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Bottom Sheet Modal Container */}
      <div
        className={`relative z-50 w-full max-w-xl flex flex-col ${
          standaloneMobileFrame ? 'max-h-[calc(100dvh-136px)] mb-20' : 'max-h-[85dvh]'
        } bg-surface-container-low rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] overflow-hidden transition-transform duration-300`}
      >
        {/* Drag Handle & Modal Header */}
        <div className="pt-space-sm px-gutter flex flex-col items-center shrink-0 bg-surface-container-low">
          <div className="w-12 h-1.5 rounded-full bg-surface-bright/70 mb-space-sm active:scale-95 transition-transform cursor-grab"></div>
          <div className="w-full flex items-start justify-between pb-space-sm">
            <div className="flex flex-col pr-space-xs">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-semibold tracking-tight">
                  Select Model
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-label-sm text-label-sm font-medium whitespace-nowrap">
                  Workspace Active
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                Switch neural weights, context tokens &amp; reasoning depth
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Dismiss Sheet"
              className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all active:scale-95 shrink-0 ml-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Filter Pills Carousel */}
          <div className="w-full flex items-center gap-space-xs overflow-x-auto py-space-xs no-scrollbar">
            {[
              { id: 'all', label: 'All Models' },
              { id: 'reasoning', label: 'Reasoning & Logic' },
              { id: 'fast', label: 'Fast & Ultra-Light' },
              { id: 'swe', label: 'Specialized SWE' },
            ].map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 980);
                    setActiveFilter(filter.id as typeof activeFilter);
                  }}
                  className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-bright'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto px-gutter py-space-md flex flex-col gap-space-md overscroll-contain">
          {filteredModels.map((model) => {
            const isSelected = selectedModelId === model.id;
            const iconBgClass =
              model.accentColor === 'tertiary'
                ? 'bg-tertiary/20 text-tertiary'
                : model.accentColor === 'secondary'
                  ? 'bg-secondary/20 text-secondary'
                  : model.accentColor === 'primary-fixed'
                    ? 'bg-primary-fixed/20 text-primary-fixed'
                    : 'bg-primary/20 text-primary';

            const badgeBgClass =
              model.accentColor === 'tertiary'
                ? 'bg-tertiary/20 text-tertiary'
                : model.accentColor === 'secondary'
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-primary/20 text-primary';

            const metricIconColor =
              model.accentColor === 'tertiary'
                ? 'text-tertiary'
                : model.accentColor === 'secondary'
                  ? 'text-secondary'
                  : 'text-primary';

            return (
              <div
                key={model.id}
                onClick={() => {
                  playHapticFeedback(audioStyle, 'major');
                  onSelectModel(model.id);
                }}
                className={`group relative p-space-md rounded-2xl bg-surface-container cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-primary/10 via-surface-container to-surface-container shadow-md ring-1 ring-primary/30'
                    : 'hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-start justify-between gap-space-sm mb-space-xs">
                  <div className="flex items-center gap-space-sm">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${iconBgClass}`}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={
                          model.id === 'gpt-4o'
                            ? { fontVariationSettings: "'FILL' 1" }
                            : undefined
                        }
                      >
                        {model.icon}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-title-md text-title-md text-on-surface font-semibold tracking-tight">
                          {model.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm whitespace-nowrap ${badgeBgClass}`}
                        >
                          {model.badge}
                        </span>
                      </div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        {model.subtitle}
                      </p>
                    </div>
                  </div>
                  {/* Selection Ring / Radio */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">
                      check
                    </span>
                  </div>
                </div>

                <p className="font-body-md text-body-md text-on-surface-variant my-space-xs leading-snug">
                  {model.description}
                </p>

                {/* Tags / Badges */}
                <div className="flex flex-wrap gap-1.5 mt-space-xs mb-space-sm">
                  {model.tags.map((tag) => {
                    const highlightClass = tag.highlighted
                      ? model.accentColor === 'tertiary'
                        ? 'bg-tertiary/15 text-tertiary'
                        : model.accentColor === 'secondary'
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-primary/15 text-primary'
                      : 'bg-surface-container-high text-on-surface-variant';
                    return (
                      <span
                        key={tag.label}
                        className={`px-2 py-0.5 rounded-md font-label-sm text-label-sm whitespace-nowrap ${highlightClass}`}
                      >
                        {tag.label}
                      </span>
                    );
                  })}
                </div>

                {/* Telemetry Metrics Bar */}
                <div className="flex items-center justify-between pt-space-xs text-on-surface-variant/80 font-label-sm text-label-sm bg-surface-container-lowest/40 px-space-sm py-1.5 rounded-lg tabular-nums">
                  <span className="flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[14px] ${metricIconColor}`}>
                      {model.metrics.ttftIcon}
                    </span>
                    {model.metrics.ttft}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      {model.metrics.speedIcon}
                    </span>
                    {model.metrics.speed}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      {model.metrics.traitIcon}
                    </span>
                    {model.metrics.trait}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Advanced Model Runtime Configuration Section */}
          <div className="p-space-md rounded-2xl bg-surface-container-high/60 flex flex-col gap-space-md">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold tracking-wide uppercase">
                  Reasoning Effort
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-medium">
                {effortLabelText}
              </span>
            </div>

            {/* Segmented 3-Way Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-container-lowest">
              {(
                [
                  { id: 'Low', sub: 'Fastest response' },
                  { id: 'Medium', sub: 'Optimal balance' },
                  { id: 'High', sub: 'Exhaustive search' },
                ] as const
              ).map((eff) => {
                const isActive = reasoningEffort === eff.id;
                return (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() => {
                      playHapticFeedback(audioStyle, 'preset');
                      onChangeReasoningEffort(eff.id);
                    }}
                    className={`py-2 px-2 rounded-lg font-label-sm text-label-sm transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      isActive
                        ? 'font-semibold bg-surface-container-high text-primary shadow-sm'
                        : 'font-medium text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>{eff.id}</span>
                    <span
                      className={`text-[10px] font-normal whitespace-nowrap ${
                        isActive ? 'text-primary/80' : 'text-on-surface-variant/70'
                      }`}
                    >
                      {eff.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Capability Toggles */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              {/* Toggle 1: Live Web Search Grounding */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Live Web Search Grounding
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Fetch authoritative references &amp; real-time events
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={webSearchEnabled}
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 1050);
                    onToggleWebSearch();
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative focus:outline-none cursor-pointer shrink-0 ${
                    webSearchEnabled ? 'bg-primary' : 'bg-surface-bright'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-surface-container-lowest shadow-sm transform transition-transform ${
                      webSearchEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Isolated Code Sandbox */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">data_object</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-medium">
                      Isolated Code Sandbox
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      Execute Python computations in safe WASM container
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={codeSandboxEnabled}
                  onClick={() => {
                    playHapticFeedback(audioStyle, 'subtle', 950);
                    onToggleCodeSandbox();
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors relative focus:outline-none cursor-pointer shrink-0 ${
                    codeSandboxEnabled ? 'bg-primary' : 'bg-surface-bright'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-surface-container-lowest shadow-sm transform transition-transform ${
                      codeSandboxEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sheet Sticky Action Footer */}
        <div className="p-gutter pt-space-sm bg-surface-container-low/95 backdrop-blur-md flex flex-col gap-space-xs shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
          <button
            type="button"
            onClick={handleApply}
            className="w-full h-12 rounded-xl bg-primary text-on-primary font-title-md text-title-md font-semibold flex items-center justify-center gap-space-xs shadow-[0_4px_20px_rgba(78,222,163,0.35)] active:scale-[0.98] transition-all cursor-pointer"
          >
            {isApplying ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                <span>Switching Model Weights...</span>
              </>
            ) : (
              <>
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span>Apply Model &amp; Continue</span>
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            <span>Changes apply instantly to current chat thread.</span>
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
