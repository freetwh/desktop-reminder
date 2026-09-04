export const REMINDER_INTERVAL_MS = 60 * 60 * 1000;
export const MAX_BUBBLE_DURATION_MS = 5 * 60 * 1000;

/** Keep a reminder visible for up to five minutes, without outlasting its interval. */
export function getReminderBubbleDurationMs(intervalMs: number): number {
  return Math.min(MAX_BUBBLE_DURATION_MS, intervalMs);
}
export const SUSPEND_GAP_MS = 90 * 1000;

export type Posture = 'stand' | 'sit' | 'walk';

export type PostureReminder = {
  posture: Posture;
  label: string;
  icon: string;
  messages: readonly string[];
};

export const POSTURE_REMINDERS: readonly PostureReminder[] = [
  {
    posture: 'stand',
    label: '站一站',
    icon: '🌱',
    messages: [
      '坐得够久啦，慢慢站起来伸个懒腰吧～',
      '换成站姿办公一会儿，肩颈会感谢你的。',
      '该让双腿接班啦，站起来看看远处吧！',
      '轻轻起身，舒展一下背部，我们站着工作一会儿。',
    ],
  },
  {
    posture: 'sit',
    label: '坐一坐',
    icon: '🫖',
    messages: [
      '辛苦啦，坐下来放松双腿，记得让背部有支撑。',
      '现在换回舒适坐姿吧，双脚稳稳踩在地面上。',
      '站得很棒！坐一会儿，肩膀也轻轻放下来。',
      '给身体一个温柔的停靠：坐正、放松、慢慢呼吸。',
    ],
  },
  {
    posture: 'walk',
    label: '走一走',
    icon: '☁️',
    messages: [
      '去接杯水、走一小圈吧，眼睛也休息一下。',
      '暂时离开屏幕三分钟，走走会有新的灵感～',
      '小小散步时间到！活动脚踝，也看看窗外。',
      '陪自己走几步吧，喝口水，再元气满满地回来。',
    ],
  },
] as const;

export function nextPostureIndex(currentIndex: number): number {
  return (currentIndex + 1) % POSTURE_REMINDERS.length;
}

export function pickMessage(reminder: PostureReminder, random = Math.random): string {
  return reminder.messages[Math.floor(random() * reminder.messages.length)]!;
}

export function shouldResetAfterSuspension(previousTick: number, now: number): boolean {
  return now - previousTick > SUSPEND_GAP_MS;
}
