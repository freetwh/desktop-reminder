import { useEffect, useRef, useState } from 'react';
import {
  animateReminder,
  createReminderScene,
  destroyReminderScene,
  setMouthOpen,
  type ReminderScene,
} from './live2dScene';

let pendingTeardown: Promise<void> = Promise.resolve();

type Live2DPetProps = {
  reminderRevision: number;
  speaking: boolean;
};

export default function Live2DPet({ reminderRevision, speaking }: Live2DPetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReminderScene | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const controller = new AbortController();
    let scene: ReminderScene | null = null;
    let observer: ResizeObserver | null = null;

    const setup = pendingTeardown
      .then(async () => {
        if (controller.signal.aborted) return;
        scene = await createReminderScene(host, controller.signal);
        if (controller.signal.aborted) {
          destroyReminderScene(scene);
          scene = null;
          return;
        }
        sceneRef.current = scene;
        observer = new ResizeObserver(() => scene?.resize());
        observer.observe(host);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => {
      controller.abort();
      sceneRef.current = null;
      pendingTeardown = setup.then(() => {
        observer?.disconnect();
        observer = null;
        if (scene) destroyReminderScene(scene);
        scene = null;
      });
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene && reminderRevision > 0) animateReminder(scene);
  }, [reminderRevision]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !speaking) return;

    const timer = window.setInterval(() => {
      setMouthOpen(scene, 0.25 + Math.random() * 0.55);
    }, 92);
    return () => {
      window.clearInterval(timer);
      setMouthOpen(scene, 0);
    };
  }, [speaking]);

  return (
    <div ref={hostRef} className="pet-stage" aria-label="Live2D 姿势提醒伙伴">
      {failed ? <div className="model-error">角色加载失败<br />请检查模型资源</div> : null}
    </div>
  );
}
