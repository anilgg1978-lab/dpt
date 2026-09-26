import React, { useState } from 'react';
import { AudioStyle, playHapticFeedback, getAudioContext } from '../utils/haptics';

export type PopoverVariant = 'haptic-style-3way' | 'haptic-badge' | 'minimal';

interface PromptReasoningPopoverProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  budget: number;
  onChangeBudget: (val: number) => void;
  audioStyle: AudioStyle;
  onChangeAudioStyle: (style: AudioStyle) => void;
  streamCot: boolean;
  onToggleStreamCot: () => void;
  autoVerify: boolean;
  onToggleAutoVerify: () => void;
  variant?: PopoverVariant;
}

export const PromptReasoningPopover: React.FC<PromptReasoningPopoverProps> = ({
  isOpen,
  onToggleOpen,
  budget,
  onChangeBudget,
  audioStyle,
  onChangeAudioStyle,
  streamCot,
  onToggleStreamCot,
  autoVerify,
  onToggleAutoVerify,
  variant = 'haptic-style-3way',
}) => {
  const [pulseKey, setPulseKey] = useState(0);
  const [activeRingId, setActiveRingId] = useState<string | null>(null);

  const min = 1024;
  const max = 32768;
  const pct = ((budget - min) / (max - min)) * 100;

  // Cost model: ~$0.001 per 1,024 reasoning tokens ($1/million)
  const costNum = budget * 0.000001;
  const costStr = '$' + costNum.toFixed(3);

  // Latency model: base 0.5s + scale
  const latencyNum = (0.5 + (budget / 32768) * 1.7).toFixed(1);
  const latencyStr = '~' + latencyNum + 's';

  // Token label
  const tokStr =
    (budget >= 1000
      ? (budget / 1024).toFixed(budget % 1024 === 0 ? 0 : 1) + 'k'
      : budget) + ' tok';

  let matchingPreset: 'off' | 'low' | 'med' | 'high' | null = null;
  if (budget <= 1024) matchingPreset = 'off';
  else if (budget === 4096) matchingPreset = 'low';
  else if (budget === 16384) matchingPreset = 'med';
  else if (budget === 32768) matchingPreset = 'high';

  const titleMap: Record<'off' | 'low' | 'med' | 'high', string> = {
    off: 'Off',
    low: 'Low (4k)',
    med: 'Med (16k)',
    high: 'High (32k)',
  };

  const compactK = (budget / 1024).toFixed(budget % 1024 === 0 ? 0 : 1) + 'k';
  const presetBadgeText = matchingPreset
    ? titleMap[matchingPreset]
    : `Custom (${(budget / 1024).toFixed(1)}k)`;

  const triggerLabelText = matchingPreset
    ? `Reasoning: ${titleMap[matchingPreset]}`
    : `Reasoning: Custom (${compactK})`;

  const triggerHapticAndVisual = (
    newVal: number,
    ringId?: string,
    forceMajor?: boolean
  ) => {
    const clamped = Math.max(1024, Math.min(32768, Number(newVal)));
    const isNotchTick = [1024, 4096, 8192, 16384, 24576, 32768].includes(clamped);
    const isMajor = forceMajor || isNotchTick;

    if (clamped <= 1024) {
      playHapticFeedback(audioStyle, 'off');
    } else if (isMajor) {
      playHapticFeedback(audioStyle, 'major');
    } else {
      const dynamicPitch = 820 + (clamped / 32768) * 380;
      playHapticFeedback(audioStyle, 'subtle', dynamicPitch);
    }

    setPulseKey((k) => k + 1);
    if (ringId) {
      setActiveRingId(ringId);
      setTimeout(() => setActiveRingId(null), 500);
    }
    onChangeBudget(clamped);
  };

  const handleSelectAudioStyle = (style: AudioStyle, ringId: string) => {
    onChangeAudioStyle(style);
    if (style !== 'muted') {
      getAudioContext();
      playHapticFeedback(style, 'major');
    }
    setPulseKey((k) => k + 1);
    setActiveRingId(ringId);
    setTimeout(() => setActiveRingId(null), 500);
  };

  const audioMeta = {
    mechanical: { label: 'Mechanical', icon: 'touch_app' },
    bubble: { label: 'Soft Bubble', icon: 'water_drop' },
    muted: { label: 'Muted', icon: 'volume_off' },
  }[audioStyle];

  return (
    <div className="relative flex items-center">
      {isOpen && (
        <div
          id="reasoningPopover"
          className="absolute bottom-full mb-space-sm left-0 w-[360px] sm:w-96 bg-surface-container-low/95 border border-outline-variant/40 rounded-2xl p-space-md shadow-2xl z-50 flex flex-col gap-space-sm backdrop-blur-xl ring-1 ring-white/5"
        >
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="space-y-space-2xs">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[17px] text-primary">
                  psychology
                </span>
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  Prompt Reasoning Override
                </span>
              </div>
              <div className="flex items-center gap-1 font-label-sm text-label-sm text-outline">
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium text-[11px] border border-primary/20 whitespace-nowrap">
                  Next prompt only
                </span>
                <span>•</span>
                <span>Overrides session (Medium)</span>
              </div>
            </div>

            {/* Right Controls: Haptic Badge (when variant === 'haptic-badge') + Reset */}
            <div className="flex items-center gap-2 shrink-0">
              {variant === 'haptic-badge' && (
                <button
                  type="button"
                  onClick={() => {
                    const nextStyle: AudioStyle =
                      audioStyle === 'muted' ? 'mechanical' : 'muted';
                    handleSelectAudioStyle(nextStyle, 'haptic-badge-btn');
                  }}
                  title="Synthesized Web Audio Tactile Clicks Active. Click to toggle."
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-label-sm transition-all cursor-pointer group ${
                    audioStyle !== 'muted'
                      ? 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'
                      : 'bg-surface-container border border-outline-variant/40 text-outline hover:text-on-surface'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[13px] ${
                      audioStyle !== 'muted' ? 'animate-pulse' : ''
                    }`}
                  >
                    {audioStyle !== 'muted' ? 'graphic_eq' : 'volume_off'}
                  </span>
                  <span className="font-code-inline font-semibold whitespace-nowrap">
                    {audioStyle !== 'muted' ? 'Haptic ON' : 'Muted'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => triggerHapticAndVisual(16384, 'reset-btn', true)}
                className={`text-outline hover:text-primary text-label-sm font-label-sm underline transition-colors cursor-pointer ${
                  activeRingId === 'reset-btn' ? 'animate-elastic-btn haptic-ring-active' : ''
                }`}
              >
                Reset
              </button>
            </div>
          </div>

          {/* 3-Way Haptic Feedback Style Selector (when variant === 'haptic-style-3way') */}
          {variant === 'haptic-style-3way' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">
                    {audioMeta.icon}
                  </span>
                  <span className="font-medium">Haptic Feedback Style</span>
                </div>
                <span className="font-code-inline text-primary text-[10px] uppercase font-semibold tracking-wider">
                  {audioMeta.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
                {(
                  [
                    {
                      id: 'mechanical',
                      label: 'Click',
                      icon: 'touch_app',
                      title: 'Mechanical Click (tactile switch, crisp snap)',
                    },
                    {
                      id: 'bubble',
                      label: 'Bubble',
                      icon: 'water_drop',
                      title: 'Soft Bubble (warm water-droplet blip)',
                    },
                    {
                      id: 'muted',
                      label: 'Muted',
                      icon: 'volume_off',
                      title: 'Muted (silent haptics only)',
                    },
                  ] as const
                ).map((item) => {
                  const isActive = audioStyle === item.id;
                  const ringId = `audio-${item.id}`;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.title}
                      onClick={() => handleSelectAudioStyle(item.id, ringId)}
                      className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 font-label-sm text-label-sm text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary/20 text-primary font-semibold border border-primary/30 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      } ${
                        activeRingId === ringId
                          ? 'animate-elastic-btn haptic-ring-active'
                          : ''
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Effort Preset 4-Way Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span className="font-medium">Effort Preset</span>
              <span
                className={`font-code-inline text-primary text-[11px] px-1.5 py-0.5 rounded font-semibold transition-all ${
                  matchingPreset
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-surface-container'
                }`}
              >
                {presetBadgeText}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
              {[
                { id: 'off', label: 'Off', tokens: 1024 },
                { id: 'low', label: 'Low', tokens: 4096 },
                { id: 'med', label: 'Med', tokens: 16384 },
                { id: 'high', label: 'High (32k)', tokens: 32768 },
              ].map((preset) => {
                const isSelected = matchingPreset === preset.id;
                const ringId = `preset-${preset.id}`;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      triggerHapticAndVisual(preset.tokens, ringId, true)
                    }
                    className={`py-1 rounded text-center font-label-sm text-label-sm transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-primary/20 text-primary font-semibold shadow-sm border border-primary/30'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    } ${
                      activeRingId === ringId
                        ? 'animate-elastic-btn haptic-ring-active'
                        : ''
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thinking Budget Slider & Floating Cost Tooltip */}
          <div className="p-space-sm rounded-xl bg-surface-container-lowest/90 border border-outline-variant/40 space-y-space-xs shadow-inner relative overflow-hidden tabular-nums">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm font-medium text-on-surface">
                  Thinking Budget
                </span>
                <span
                  key={`pill-${pulseKey}`}
                  className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 font-code-inline text-[11px] font-semibold transition-all shadow-[0_0_10px_rgba(78,222,163,0.15)] inline-block origin-center animate-badge-flash"
                >
                  {budget.toLocaleString()} tokens
                </span>
              </div>
              <span className="font-label-sm text-[11px] text-outline flex items-center gap-1 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse"></span>
                {latencyStr} TTFT • ~{costStr}
              </span>
            </div>

            <div className="relative pt-7 pb-1">
              {/* Spring bouncing floating tooltip */}
              <div
                style={{ left: `${Math.max(14, Math.min(86, pct))}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-150 ease-out z-20"
              >
                <div
                  key={`tooltip-${pulseKey}`}
                  className="bg-surface-container-high/95 border border-primary/50 shadow-xl px-2 py-0.5 rounded-md flex items-center gap-1.5 backdrop-blur-md ring-1 ring-primary/20 whitespace-nowrap animate-spring-punch"
                >
                  <span className="flex items-center gap-0.5 text-primary font-code-inline font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[12px]">
                      payments
                    </span>
                    <span>{costStr}</span>
                  </span>
                  <span className="text-outline text-[10px]">•</span>
                  <span className="text-on-surface-variant font-code-inline text-[10px]">
                    {latencyStr}
                  </span>
                  <span className="text-outline text-[10px]">•</span>
                  <span className="text-primary font-code-inline text-[10px] font-semibold">
                    {tokStr}
                  </span>
                </div>
                <div className="w-1.5 h-1.5 bg-surface-container-high border-r border-b border-primary/50 rotate-45 -mt-1 shadow-sm"></div>
              </div>

              <input
                aria-label="Thinking Budget"
                className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none relative z-10 transition-all"
                max={32768}
                min={1024}
                step={1024}
                type="range"
                value={budget}
                onChange={(e) =>
                  triggerHapticAndVisual(Number(e.target.value))
                }
              />

              {/* Snap tick buttons with acoustic feedback */}
              <div className="flex justify-between items-center text-[10px] font-code-inline text-outline pt-1 relative">
                {[
                  { label: '1k', tokens: 1024 },
                  { label: '8k', tokens: 8192 },
                  { label: '16k', tokens: 16384 },
                  { label: '24k', tokens: 24576 },
                  { label: '32k max', tokens: 32768 },
                ].map((tick) => {
                  const isTickMatch = budget === tick.tokens;
                  const ringId = `tick-${tick.tokens}`;
                  return (
                    <button
                      key={tick.tokens}
                      type="button"
                      onClick={() =>
                        triggerHapticAndVisual(tick.tokens, ringId, true)
                      }
                      className={`px-1 py-0.5 rounded transition-all cursor-pointer relative ${
                        isTickMatch
                          ? 'text-primary font-bold bg-primary/10 border border-primary/25 shadow-sm'
                          : 'hover:text-primary font-medium text-outline'
                      } ${
                        activeRingId === ringId
                          ? 'animate-elastic-btn haptic-ring-active'
                          : ''
                      }`}
                    >
                      {tick.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Check Indicators */}
          <div className="space-y-1.5 pt-space-xs border-t border-outline-variant/30">
            <button
              type="button"
              onClick={() => {
                playHapticFeedback(audioStyle, 'subtle', 1040);
                onToggleStreamCot();
              }}
              className="w-full flex items-center justify-between cursor-pointer group text-left"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[15px] text-outline group-hover:text-on-surface">
                  stream
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-on-surface">
                  Stream chain-of-thought
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full inline-block transition-colors ${
                  streamCot ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                playHapticFeedback(audioStyle, 'subtle', 980);
                onToggleAutoVerify();
              }}
              className="w-full flex items-center justify-between cursor-pointer group text-left"
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[15px] text-outline group-hover:text-on-surface">
                  verified
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant group-hover:text-on-surface">
                  Autonomous step verification
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full inline-block transition-colors ${
                  autoVerify ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Dock Trigger Button */}
      <button
        type="button"
        onClick={() => {
          playHapticFeedback(audioStyle, 'subtle', 1000);
          onToggleOpen();
        }}
        className="flex items-center gap-1.5 px-space-sm py-1 rounded-lg bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20 transition-all font-label-md text-label-md font-medium shadow-sm cursor-pointer whitespace-nowrap"
      >
        <span className="material-symbols-outlined text-[16px] text-primary">
          psychology
        </span>
        <span>{triggerLabelText}</span>
        <span className="font-label-sm text-[10px] px-1 py-0.2 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider">
          Override
        </span>
        <span className="material-symbols-outlined text-[16px] text-primary ml-space-2xs">
          tune
        </span>
      </button>
    </div>
  );
};
