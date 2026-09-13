import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  BellRing,
  Clock3,
  AudioLines,
  GripHorizontal,
  LogOut,
  Pin,
  Scaling,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { playBitChime, primeAudio } from './chime';
import {
  closeDesktopWidget,
  isScreenLocked,
  placeWidgetAtBottomRight,
  startDesktopDrag,
  setAlwaysOnTop,
} from './desktopWindow';
import Live2DPet from './Live2DPet';
import {
  nextPostureIndex,
  pickMessage,
  POSTURE_REMINDERS,
  getReminderBubbleDurationMs,
  shouldResetAfterSuspension,
} from './reminders';
import { setLive2DSoundEnabled as setLive2DSound } from './live2dScene';

const MIN_SCALE_PERCENT = 50;
const MAX_SCALE_PERCENT = 100;
const SCALE_STEP_PERCENT = 5;
const DEFAULT_SCALE_PERCENT = 100;
const LEGACY_SCALE_OPTIONS = [80, 100, 120] as const;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 1_440;
const DEFAULT_PROMPTS = POSTURE_REMINDERS.flatMap((reminder) => [...reminder.messages]).slice(0, 3);
const MODEL_OPTIONS = [
  { id: 'haru', name: 'Haru', path: './live2d/haru/Haru.model3.json' },
  { id: 'hibiki', name: 'Hibiki', path: './live2d/hibiki/runtime/hibiki.model3.json' },
  { id: 'zundamon', name: 'Zundamon', path: './live2d/zundamon/runtime/zundamon.model3.json' },
] as const;
const BUILT_IN_SOUNDS = [
  { id: 'bell', name: '清脆铃声', src: './audio/bell.mp3' },
  { id: 'positive', name: '轻盈提示', src: './audio/positive.mp3' },
  { id: 'message', name: '消息提醒', src: './audio/message.mp3' },
] as const;

function readScalePercent(): number {
  const stored = Number(localStorage.getItem('scale-percent'));
  if (Number.isFinite(stored) && stored >= MIN_SCALE_PERCENT && stored <= MAX_SCALE_PERCENT) {
    return stored;
  }

  const legacyIndex = Number(localStorage.getItem('scale-index') ?? 1);
  return Math.min(
    MAX_SCALE_PERCENT,
    Math.max(MIN_SCALE_PERCENT, LEGACY_SCALE_OPTIONS[legacyIndex] ?? DEFAULT_SCALE_PERCENT),
  );
}

function readIntervalMinutes(): number {
  const stored = Number(localStorage.getItem('interval-minutes') ?? 30);
  return Number.isInteger(stored) && stored >= MIN_INTERVAL_MINUTES && stored <= MAX_INTERVAL_MINUTES
    ? stored
    : 30;
}

type ActiveReminder = {
  message: string;
};

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value === 'true';
}

function readPrompts(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem('reminder-prompts') ?? 'null');
    if (Array.isArray(value)) {
      const prompts = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
      if (prompts.length) return prompts;
    }
  } catch { /* use defaults */ }
  return [...DEFAULT_PROMPTS];
}

type StoredAudio = { kind: 'built-in'; id: string } | { kind: 'custom'; dataUrl: string };

const DEFAULT_AUDIO: StoredAudio = { kind: 'built-in', id: BUILT_IN_SOUNDS[0].id };

function readStoredAudio(): StoredAudio {
  try {
    const value = JSON.parse(localStorage.getItem('reminder-audio') ?? 'null');
    if (value && typeof value === 'object' && (value as StoredAudio).kind === 'custom' && typeof (value as { dataUrl?: unknown }).dataUrl === 'string') {
      return { kind: 'custom', dataUrl: (value as { dataUrl: string }).dataUrl };
    }
    if (value && typeof value === 'object' && (value as StoredAudio).kind === 'built-in') {
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string' && BUILT_IN_SOUNDS.some((sound) => sound.id === id)) return { kind: 'built-in', id };
    }
  } catch { /* migrate legacy plain-string value below */ }
  const legacy = localStorage.getItem('reminder-audio');
  if (legacy && legacy.startsWith('data:')) return { kind: 'custom', dataUrl: legacy };
  return DEFAULT_AUDIO;
}

function resolveAudioSource(audio: StoredAudio): string | null {
  if (audio.kind === 'custom') return audio.dataUrl;
  return BUILT_IN_SOUNDS.find((sound) => sound.id === audio.id)?.src ?? null;
}

export default function App() {
  const [postureIndex, setPostureIndex] = useState(() =>
    Number(localStorage.getItem('posture-index') ?? 0) % POSTURE_REMINDERS.length,
  );
  const [alwaysOnTop, setPinned] = useState(() => readStoredBoolean('always-on-top', true));
  const [reminderVolume, setReminderVolume] = useState(() => {
    const value = Number(localStorage.getItem('reminder-volume') ?? 20);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 20;
  });
  const [prompts, setPrompts] = useState(readPrompts);
  const [reminderAudio, setReminderAudio] = useState(readStoredAudio);
  const [live2DSoundEnabled, setLive2DSoundEnabled] = useState(() =>
    readStoredBoolean('live2d-sound-enabled', false),
  );
  const [intervalMinutes, setIntervalMinutes] = useState(readIntervalMinutes);
  const [intervalDraft, setIntervalDraft] = useState(() => String(readIntervalMinutes()));
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [modelId, setModelId] = useState(() => localStorage.getItem('model-id') ?? 'haru');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [scalePercent, setScalePercent] = useState(readScalePercent);
  const [showScalePicker, setShowScalePicker] = useState(false);
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [showVolumePicker, setShowVolumePicker] = useState(false);
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [reminderRevision, setReminderRevision] = useState(0);
  const intervalMs = intervalMinutes * 60 * 1000;
  const nextReminderAt = useRef(Date.now() + intervalMs);
  const lastTickAt = useRef(Date.now());
  const screenLocked = useRef(false);
  const bubbleTimer = useRef<number | null>(null);

  const showReminder = useCallback((advanceRotation: boolean) => {
    const reminder = POSTURE_REMINDERS[postureIndex]!;
    setActiveReminder({
      message: prompts.length ? prompts[Math.floor(Math.random() * prompts.length)]! : pickMessage(reminder),
    });
    setReminderRevision((revision) => revision + 1);
    const source = resolveAudioSource(reminderAudio);
    if (source) {
      const audio = new Audio(source);
      audio.volume = reminderVolume / 100;
      void audio.play().catch(() => playBitChime(reminderVolume / 100));
    } else playBitChime(reminderVolume / 100);

    if (bubbleTimer.current !== null) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => {
      bubbleTimer.current = null;
      setActiveReminder(null);
    }, getReminderBubbleDurationMs(intervalMs));

    if (advanceRotation) {
      const nextIndex = nextPostureIndex(postureIndex);
      setPostureIndex(nextIndex);
      localStorage.setItem('posture-index', String(nextIndex));
      nextReminderAt.current = Date.now() + intervalMs;
    }
  }, [intervalMs, postureIndex, prompts, reminderAudio, reminderVolume]);

  useEffect(() => {
    void setAlwaysOnTop(alwaysOnTop);
    void placeWidgetAtBottomRight();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState !== 'visible' || shouldResetAfterSuspension(lastTickAt.current, now)) {
        nextReminderAt.current = now + intervalMs;
      }
      lastTickAt.current = now;

      if (screenLocked.current) return;
      const timeLeft = nextReminderAt.current - now;
      if (timeLeft <= 0) showReminder(true);
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        lastTickAt.current = now;
        nextReminderAt.current = now + intervalMs;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, showReminder]);

  useEffect(() => {
    let disposed = false;
    const refreshLockState = async () => {
      const locked = await isScreenLocked();
      if (disposed) return;
      const wasLocked = screenLocked.current;
      screenLocked.current = locked;
      if (wasLocked && !locked) {
        const now = Date.now();
        lastTickAt.current = now;
        nextReminderAt.current = now + intervalMs;
      }
    };
    void refreshLockState();
    const timer = window.setInterval(() => void refreshLockState(), 5000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  useEffect(() => () => {
    if (bubbleTimer.current !== null) window.clearTimeout(bubbleTimer.current);
  }, []);

  const togglePin = () => {
    const next = !alwaysOnTop;
    setPinned(next);
    localStorage.setItem('always-on-top', String(next));
    void setAlwaysOnTop(next);
  };

  const dismissReminder = () => {
    if (bubbleTimer.current !== null) {
      window.clearTimeout(bubbleTimer.current);
      bubbleTimer.current = null;
    }
    setActiveReminder(null);
  };

  const changeVolume = (value: number) => {
    setReminderVolume(value);
    localStorage.setItem('reminder-volume', String(value));
  };

  const toggleLive2DSound = () => {
    primeAudio();
    const next = !live2DSoundEnabled;
    setLive2DSound(next);
    setLive2DSoundEnabled(next);
    localStorage.setItem('live2d-sound-enabled', String(next));
  };

  useEffect(() => {
    setLive2DSound(live2DSoundEnabled);
  }, [live2DSoundEnabled]);

  const changeScale = (nextPercent: number) => {
    setScalePercent(nextPercent);
    localStorage.setItem('scale-percent', String(nextPercent));
  };

  const chooseInterval = (minutes: number) => {
    setIntervalMinutes(minutes);
    localStorage.setItem('interval-minutes', String(minutes));
    const next = minutes * 60 * 1000;
    nextReminderAt.current = Date.now() + next;
    setShowIntervalPicker(false);
  };

  const saveInterval = () => {
    const minutes = Number(intervalDraft);
    if (!Number.isInteger(minutes) || minutes < MIN_INTERVAL_MINUTES || minutes > MAX_INTERVAL_MINUTES) return;
    chooseInterval(minutes);
  };

  const activeModel = MODEL_OPTIONS.find((model) => model.id === modelId) ?? MODEL_OPTIONS[0];

  const closeControls = useCallback(() => {
    setShowControls(false);
    setShowIntervalPicker(false);
    setShowModelPicker(false);
    setShowScalePicker(false);
    // The "more" panel is a modal: it only closes through its own close button.
    setShowMorePanel(false);
    setShowVolumePicker(false);
  }, []);

  useEffect(() => {
    if (!showControls || showMorePanel) return;
    const timer = window.setTimeout(closeControls, 8_000);
    return () => window.clearTimeout(timer);
  }, [closeControls, showControls, showMorePanel]);

  const closeMorePanel = useCallback(() => setShowMorePanel(false), []);

  return (
    <main
      className={`widget-shell ${showControls ? 'controls-visible' : ''}`}
      style={{
        '--pet-width': `${324 * scalePercent / 100}px`,
        '--pet-height': `${327 * scalePercent / 100}px`,
      } as CSSProperties}
      onPointerDown={(event) => {
        primeAudio();
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        // Interactive controls and the reminder bubble do not start window dragging.
        if (!target.closest('button, input, textarea, .speech-bubble, .more-overlay, .more-panel')) void startDesktopDrag();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setShowControls(true);
      }}
      onClick={(event) => {
        if (showMorePanel) return;
        if (!(event.target as HTMLElement).closest('.control-dock, .interval-picker, .model-picker, .scale-picker, .more-panel, .volume-picker')) {
          closeControls();
        }
      }}
    >
      <div className="drag-handle" data-tauri-drag-region>
        <GripHorizontal className="drag-dots" aria-hidden="true" data-tauri-drag-region />
      </div>

      {activeReminder ? (
        <div className="speech-bubble" role="status" aria-live="assertive">
          <span>{activeReminder.message}</span>
          <button type="button" onClick={dismissReminder} aria-label="确认提醒">OK</button>
        </div>
      ) : null}

      <Live2DPet reminderRevision={reminderRevision} speaking={activeReminder !== null} modelPath={activeModel.path} />

      {showControls ? <>
        {showIntervalPicker ? <div className="interval-picker" role="group" aria-label="提醒间隔">
          <label htmlFor="interval-minutes">提醒间隔（分钟）</label>
          <div>
            <input
              id="interval-minutes"
              type="number"
              min={MIN_INTERVAL_MINUTES}
              max={MAX_INTERVAL_MINUTES}
              step="1"
              value={intervalDraft}
              onChange={(event) => setIntervalDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') saveInterval(); }}
              autoFocus
            />
            <button onClick={saveInterval}>保存</button>
          </div>
          <small>可输入 1–1440 分钟</small>
        </div> : null}
        {showModelPicker ? <div className="model-picker" role="group" aria-label="更换角色">
          <span>选择角色</span>
          <div>{MODEL_OPTIONS.map((model) => (
            <button key={model.id} className={model.id === activeModel.id ? 'selected' : ''} onClick={() => {
              setModelId(model.id);
              localStorage.setItem('model-id', model.id);
              setShowModelPicker(false);
            }}>{model.name}</button>
          ))}</div>
        </div> : null}
        {showScalePicker ? <div className="scale-picker" role="group" aria-label="调整挂件大小">
          <label htmlFor="scale-range">
            <span>挂件大小</span>
            <output htmlFor="scale-range">{scalePercent}%</output>
          </label>
          <input
            id="scale-range"
            type="range"
            min={MIN_SCALE_PERCENT}
            max={MAX_SCALE_PERCENT}
            step={SCALE_STEP_PERCENT}
            value={scalePercent}
            aria-valuetext={`${scalePercent}%`}
            style={{
              '--scale-progress': `${((scalePercent - MIN_SCALE_PERCENT) / (MAX_SCALE_PERCENT - MIN_SCALE_PERCENT)) * 100}%`,
            } as CSSProperties}
            onChange={(event) => changeScale(Number(event.target.value))}
            autoFocus
          />
          <div className="scale-range-labels" aria-hidden="true">
            <span>{MIN_SCALE_PERCENT}%</span>
            <span>{MAX_SCALE_PERCENT}%</span>
          </div>
        </div> : null}
        {showMorePanel ? <div className="more-overlay" role="presentation" onClick={(event) => { if ((event.target as HTMLElement).closest('.control-dock')) return; event.stopPropagation(); }}><div className="more-panel" role="dialog" aria-modal="true" aria-label="更多设置">
          <div className="panel-heading"><strong>更多设置</strong><button type="button" onClick={closeMorePanel} aria-label="关闭">×</button></div>
          <label className="panel-label">提醒音频</label>
          <div className="audio-options">
            {BUILT_IN_SOUNDS.map((sound) => <button
              key={sound.id}
              type="button"
              className={reminderAudio.kind === 'built-in' && reminderAudio.id === sound.id ? 'selected' : ''}
              onClick={() => {
                const next: StoredAudio = { kind: 'built-in', id: sound.id };
                setReminderAudio(next);
                localStorage.setItem('reminder-audio', JSON.stringify(next));
                primeAudio();
                const preview = new Audio(sound.src);
                preview.volume = reminderVolume / 100;
                void preview.play().catch(() => undefined);
              }}
            >{sound.name}</button>)}
          </div>
          <label className={`audio-upload ${reminderAudio.kind === 'custom' ? 'selected' : ''}`} htmlFor="reminder-audio">
            <span>{reminderAudio.kind === 'custom' ? '已使用自定义音频' : '上传自定义音频'}</span>
            <input id="reminder-audio" type="file" accept="audio/*" onChange={(event) => {
              const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const next: StoredAudio = { kind: 'custom', dataUrl: String(reader.result) }; setReminderAudio(next); localStorage.setItem('reminder-audio', JSON.stringify(next)); }; reader.readAsDataURL(file);
            }} />
          </label>
          {reminderAudio.kind === 'custom' ? <button type="button" className="clear-audio" onClick={() => { const next: StoredAudio = { kind: 'built-in', id: BUILT_IN_SOUNDS[0].id }; setReminderAudio(next); localStorage.setItem('reminder-audio', JSON.stringify(next)); }}>恢复内置音效</button> : null}
          <label className="panel-label">角色提示语</label>
          <div className="prompt-list">
            {prompts.map((prompt, index) => <div className="prompt-row" key={index}>
              <textarea value={prompt} onChange={(event) => {
                const next = [...prompts]; next[index] = event.target.value; setPrompts(next); localStorage.setItem('reminder-prompts', JSON.stringify(next));
              }} aria-label={`提示语 ${index + 1}`} />
              <button type="button" onClick={() => { const next = prompts.filter((_, i) => i !== index); setPrompts(next); localStorage.setItem('reminder-prompts', JSON.stringify(next)); }} aria-label="删除提示语">−</button>
            </div>)}
          </div>
          <button type="button" className="add-prompt" onClick={() => { const next = [...prompts, '']; setPrompts(next); localStorage.setItem('reminder-prompts', JSON.stringify(next)); }}>＋ 添加提示语</button>
        </div></div> : null}
        {showVolumePicker ? <div className="volume-picker" role="group" aria-label="调整音量">
          <label htmlFor="volume-range"><span>提醒音量</span><output>{reminderVolume}%</output></label>
          <input id="volume-range" type="range" min="0" max="100" step="1" value={reminderVolume} onChange={(event) => changeVolume(Number(event.target.value))} autoFocus />
        </div> : null}
        <nav className="control-dock" aria-label="挂件控制">
        <button className={alwaysOnTop ? 'active' : ''} onClick={togglePin} title="置顶">
          <Pin aria-hidden="true" /><small>{alwaysOnTop ? '已置顶' : '置顶'}</small>
        </button>
        <button onClick={() => {
          setShowScalePicker((visible) => !visible);
          setShowIntervalPicker(false);
          setShowModelPicker(false);
        }} className={showScalePicker ? 'active' : ''} title="调整挂件大小">
          <Scaling aria-hidden="true" /><small>{scalePercent}%</small>
        </button>
        <button className="test-button" onClick={() => showReminder(false)} title="立即试听提醒">
          <BellRing aria-hidden="true" /><small>试一下</small>
        </button>
        <button onClick={() => {
          setIntervalDraft(String(intervalMinutes));
          setShowIntervalPicker((visible) => !visible);
          setShowModelPicker(false);
          setShowScalePicker(false);
        }} className={showIntervalPicker ? 'active' : ''} title="提醒间隔">
          <Clock3 aria-hidden="true" /><small>{intervalMinutes}分</small>
        </button>
        <button onClick={() => {
          setShowModelPicker((visible) => !visible);
          setShowIntervalPicker(false);
          setShowScalePicker(false);
        }} className={showModelPicker ? 'active' : ''} title="更换角色">
          <Sparkles aria-hidden="true" /><small>{activeModel.name}</small>
        </button>
        <button onClick={() => { setShowVolumePicker((visible) => !visible); setShowMorePanel(false); setShowScalePicker(false); setShowIntervalPicker(false); setShowModelPicker(false); }} className={showVolumePicker ? 'active' : ''} title="音量">
          {reminderVolume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          <small>音量</small>
        </button>
        <button onClick={toggleLive2DSound} className={!live2DSoundEnabled ? 'muted' : ''} title="角色原声">
          <AudioLines aria-hidden="true" />
          <small>{live2DSoundEnabled ? '原声开' : '原声关'}</small>
        </button>
        <button onClick={() => { setShowMorePanel((visible) => !visible); setShowIntervalPicker(false); setShowModelPicker(false); setShowScalePicker(false); }} className={showMorePanel ? 'active' : ''} title="更多设置">
          <Sparkles aria-hidden="true" /><small>更多</small>
        </button>
        <button className="exit-button" onClick={() => void closeDesktopWidget()} title="退出挂件">
          <LogOut aria-hidden="true" /><small>退出</small>
        </button>
        </nav>
      </> : null}
    </main>
  );
}
