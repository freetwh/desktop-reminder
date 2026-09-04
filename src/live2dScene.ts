import { Application, Ticker } from 'pixi.js';
import {
  config as live2DConfig,
  Cubism4InternalModel,
  Live2DModel,
} from 'pixi-live2d-display/cubism4';

export type ReminderLive2DModel = Live2DModel<Cubism4InternalModel>;

export type ReminderScene = {
  app: Application;
  model: ReminderLive2DModel;
  resize: () => void;
};

Live2DModel.registerTicker(Ticker);
live2DConfig.sound = false;

/** Enable or disable the sound clips bundled with each Live2D model. */
export function setLive2DSoundEnabled(enabled: boolean): void {
  live2DConfig.sound = enabled;
}

function fitModel(app: Application, model: ReminderLive2DModel): void {
  const availableWidth = app.renderer.width / app.renderer.resolution;
  const availableHeight = app.renderer.height / app.renderer.resolution;
  const scale = Math.min(
    availableWidth / model.internalModel.width,
    availableHeight / model.internalModel.height,
  );

  model.scale.set(scale * 1.08);
  model.anchor.set(0.5, 1);
  model.position.set(availableWidth / 2, availableHeight * 1.03);
}

export async function createReminderScene(
  host: HTMLElement,
  signal: AbortSignal,
  modelPath: string,
): Promise<ReminderScene> {
  const app = new Application({
    width: Math.max(host.clientWidth, 1),
    height: Math.max(host.clientHeight, 1),
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
  });

  const canvas = app.view as HTMLCanvasElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  host.appendChild(canvas);

  let model: ReminderLive2DModel | null = null;
  try {
    model = (await Live2DModel.from(modelPath, {
      autoUpdate: true,
      autoInteract: true,
    })) as ReminderLive2DModel;

    if (signal.aborted) throw new Error('Live2D scene loading was cancelled');
    app.stage.addChild(model);
    fitModel(app, model);

    model.on('hit', () => {
      void model?.motion('TapBody');
    });

    return {
      app,
      model,
      resize: () => {
        app.renderer.resize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1));
        if (model) fitModel(app, model);
      },
    };
  } catch (error) {
    model?.destroy({ children: true, texture: true, baseTexture: true });
    app.destroy(true, false);
    throw error;
  }
}

export function destroyReminderScene(scene: ReminderScene): void {
  scene.model.destroy({ children: true, texture: true, baseTexture: true });
  scene.app.destroy(true, false);
}

export function animateReminder(scene: ReminderScene): void {
  void scene.model.motion('TapBody');
  void scene.model.expression(`F0${1 + Math.floor(Math.random() * 8)}`);
}

export function setMouthOpen(scene: ReminderScene, value: number): void {
  scene.model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
}
