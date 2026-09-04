import {
  currentMonitor,
  getCurrentWindow,
  LogicalPosition,
} from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

const WIDGET_SIZE = { width: 340, height: 460 };

function inTauri(): boolean {
  return '__TAURI_INTERNALS__' in window;
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (inTauri()) await getCurrentWindow().setAlwaysOnTop(enabled);
}

export async function placeWidgetAtBottomRight(): Promise<void> {
  if (!inTauri()) return;
  const monitor = await currentMonitor();
  if (!monitor) return;
  const factor = monitor.scaleFactor;
  const right = (monitor.position.x + monitor.size.width) / factor;
  const bottom = (monitor.position.y + monitor.size.height) / factor;
  await getCurrentWindow().setPosition(
    new LogicalPosition(
      Math.round(right - WIDGET_SIZE.width - 24),
      Math.round(bottom - WIDGET_SIZE.height - 24),
    ),
  );
}

export async function closeDesktopWidget(): Promise<void> {
  if (inTauri()) await getCurrentWindow().close();
}

/** Start native window dragging from any non-interactive part of the widget. */
export async function startDesktopDrag(): Promise<void> {
  if (inTauri()) await getCurrentWindow().startDragging();
}

export async function isScreenLocked(): Promise<boolean> {
  return inTauri() ? invoke<boolean>('is_screen_locked') : false;
}
