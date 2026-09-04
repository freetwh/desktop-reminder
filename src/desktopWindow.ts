import {
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

const BASE_SIZE = { width: 340, height: 460 };

function inTauri(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (inTauri()) await getCurrentWindow().setAlwaysOnTop(enabled);
}

export async function resizeDesktopWidget(scale: number): Promise<void> {
  if (!inTauri()) return;
  await getCurrentWindow().setSize(
    new LogicalSize(BASE_SIZE.width * scale, BASE_SIZE.height * scale),
  );
}

export async function placeWidgetAtBottomRight(scale: number): Promise<void> {
  if (!inTauri()) return;
  const monitor = await currentMonitor();
  if (!monitor) return;
  const factor = monitor.scaleFactor;
  const right = (monitor.position.x + monitor.size.width) / factor;
  const bottom = (monitor.position.y + monitor.size.height) / factor;
  await getCurrentWindow().setPosition(
    new LogicalPosition(
      Math.round(right - BASE_SIZE.width * scale - 24),
      Math.round(bottom - BASE_SIZE.height * scale - 24),
    ),
  );
}

export async function closeDesktopWidget(): Promise<void> {
  if (inTauri()) await getCurrentWindow().close();
}

export async function isScreenLocked(): Promise<boolean> {
  return inTauri() ? invoke<boolean>('is_screen_locked') : false;
}
