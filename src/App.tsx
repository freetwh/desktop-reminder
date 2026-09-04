import { useCallback, useEffect, useRef, useState } from 'react';
import { playBitChime, primeAudio } from './chime';
import {
  closeDesktopWidget,
  isScreenLocked,
  placeWidgetAtBottomRight,
  resizeDesktopWidget,
  setAlwaysOnTop,
} from './desktopWindow';
import Live2DPet from './Live2DPet';
import {
  nextPostureIndex,
  pickMessage,
  POSTURE_REMINDERS,
  REMINDER_INTERVAL_MS,
  shouldResetAfterSuspension,
} from './reminders';

const BUBBLE_DURATION_MS = 12_000;
const SCALE_OPTIONS = [0.8, 1, 1.2] as const;

function readScaleIndex(): number {
  const stored = Number(localStorage.getItem('scale-index') ?? 1);
  return Number.isInteger(stored) && stored >= 0 && stored < SCALE_OPTIONS.length ? stored : 1;
}

type ActiveReminder = {
  icon: string;
  label: string;
  message: string;
};

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value === 'true';
}

function formatRemaining(milliseconds: number): string {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  if (minutes >= 60) return '约 1 小时后';
  return `${minutes} 分钟后`;
}

export default function App() {
  const [postureIndex, setPostureIndex] = useState(() =>
    Number(localStorage.getItem('posture-index') ?? 0) % POSTURE_REMINDERS.length,
  );
  const [alwaysOnTop, setPinned] = useState(() => readStoredBoolean('always-on-top', true));
  const [soundEnabled, setSoundEnabled] = useState(() => readStoredBoolean('sound-enabled', true));
  const [paused, setPaused] = useState(false);
  const [scaleIndex, setScaleIndex] = useState(readScaleIndex);
  const [activeReminder, setActiveReminder] = useState<ActiveReminder | null>(null);
  const [reminderRevision, setReminderRevision] = useState(0);
  const [remaining, setRemaining] = useState(REMINDER_INTERVAL_MS);
  const nextReminderAt = useRef(Date.now() + REMINDER_INTERVAL_MS);
  const lastTickAt = useRef(Date.now());
  const screenLocked = useRef(false);
  const bubbleTimer = useRef<number | null>(null);

  const showReminder = useCallback((advanceRotation: boolean) => {
    const reminder = POSTURE_REMINDERS[postureIndex]!;
    setActiveReminder({
      icon: reminder.icon,
      label: reminder.label,
      message: pickMessage(reminder),
    });
    setReminderRevision((revision) => revision + 1);
    if (soundEnabled) playBitChime();

    if (bubbleTimer.current !== null) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setActiveReminder(null), BUBBLE_DURATION_MS);

    if (advanceRotation) {
      const nextIndex = nextPostureIndex(postureIndex);
      setPostureIndex(nextIndex);
      localStorage.setItem('posture-index', String(nextIndex));
      nextReminderAt.current = Date.now() + REMINDER_INTERVAL_MS;
    }
  }, [postureIndex, soundEnabled]);

  useEffect(() => {
    const scale = SCALE_OPTIONS[Math.min(Math.max(scaleIndex, 0), SCALE_OPTIONS.length - 1)]!;
    void setAlwaysOnTop(alwaysOnTop);
    void resizeDesktopWidget(scale).then(() => placeWidgetAtBottomRight(scale));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (document.visibilityState !== 'visible' || shouldResetAfterSuspension(lastTickAt.current, now)) {
        nextReminderAt.current = now + REMINDER_INTERVAL_MS;
      }
      lastTickAt.current = now;

      if (paused || screenLocked.current) return;
      const timeLeft = nextReminderAt.current - now;
      setRemaining(timeLeft);
      if (timeLeft <= 0) showReminder(true);
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        lastTickAt.current = now;
        nextReminderAt.current = now + REMINDER_INTERVAL_MS;
        setRemaining(REMINDER_INTERVAL_MS);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [paused, showReminder]);

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
        nextReminderAt.current = now + REMINDER_INTERVAL_MS;
        setRemaining(REMINDER_INTERVAL_MS);
      }
    };
    void refreshLockState();
    const timer = window.setInterval(() => void refreshLockState(), 5000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => () => {
    if (bubbleTimer.current !== null) window.clearTimeout(bubbleTimer.current);
  }, []);

  const togglePin = () => {
    const next = !alwaysOnTop;
    setPinned(next);
    localStorage.setItem('always-on-top', String(next));
    void setAlwaysOnTop(next);
  };

  const toggleSound = () => {
    primeAudio();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('sound-enabled', String(next));
  };

  const changeScale = (direction: -1 | 1) => {
    const next = Math.min(Math.max(scaleIndex + direction, 0), SCALE_OPTIONS.length - 1);
    setScaleIndex(next);
    localStorage.setItem('scale-index', String(next));
    void resizeDesktopWidget(SCALE_OPTIONS[next]!);
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (!next) {
      nextReminderAt.current = Date.now() + REMINDER_INTERVAL_MS;
      setRemaining(REMINDER_INTERVAL_MS);
    }
  };

  const nextPosture = POSTURE_REMINDERS[postureIndex]!;

  return (
    <main className="widget-shell" onPointerDown={primeAudio}>
      <div className="drag-handle" data-tauri-drag-region>
        <span className="drag-dots" data-tauri-drag-region>•••</span>
        <button className="icon-button close-button" onClick={() => void closeDesktopWidget()} title="退出">×</button>
      </div>

      {activeReminder ? (
        <button className="speech-bubble" onClick={() => setActiveReminder(null)} aria-live="assertive">
          <span className="bubble-label">{activeReminder.icon} {activeReminder.label}</span>
          <span>{activeReminder.message}</span>
          <small>轻点收起</small>
        </button>
      ) : (
        <div className="next-reminder" data-tauri-drag-region>
          <span>{nextPosture.icon}</span>
          <span>{paused ? '提醒已暂停' : `${nextPosture.label} · ${formatRemaining(remaining)}`}</span>
        </div>
      )}

      <Live2DPet reminderRevision={reminderRevision} speaking={activeReminder !== null} />

      <nav className="control-dock" aria-label="挂件控制">
        <button className={alwaysOnTop ? 'active' : ''} onClick={togglePin} title="置顶">
          <span>⌖</span><small>{alwaysOnTop ? '已置顶' : '置顶'}</small>
        </button>
        <button onClick={() => changeScale(-1)} disabled={scaleIndex === 0} title="缩小">
          <span>−</span><small>缩小</small>
        </button>
        <button className="test-button" onClick={() => showReminder(false)} title="立即试听提醒">
          <span>♪</span><small>试一下</small>
        </button>
        <button onClick={() => changeScale(1)} disabled={scaleIndex === SCALE_OPTIONS.length - 1} title="放大">
          <span>＋</span><small>放大</small>
        </button>
        <button onClick={toggleSound} className={!soundEnabled ? 'muted' : ''} title="提示音">
          <span>{soundEnabled ? '♬' : '♩'}</span><small>{soundEnabled ? '有声音' : '已静音'}</small>
        </button>
        <button onClick={togglePause} className={paused ? 'paused' : ''} title="暂停提醒">
          <span>{paused ? '▶' : 'Ⅱ'}</span><small>{paused ? '继续' : '暂停'}</small>
        </button>
      </nav>
    </main>
  );
}
