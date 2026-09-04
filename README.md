# 姿态提醒

一个住在桌面上的 Live2D 姿势提醒伙伴：到时间会轻声提醒你站起来、坐好或走动一下。

![姿态提醒界面预览](docs/screenshot.jpg)

一个基于 Tauri 2、React、PixiJS 6 和 `pixi-live2d-display` 的透明桌面挂件。默认每 30 分钟在「站一站 → 坐一坐 → 走一走」之间轮换，以温馨文案和完整一首《两只老虎》的本地 8-bit 铃音提醒切换办公姿势；气泡会一直保留到点击 OK，或最多自动显示 5 分钟（不超过当前提醒间隔）。

## 使用

```bash
pnpm install
pnpm dev:desktop
```

挂件主体背景透明；右键挂件才会出现置顶、缩放、试听、提示音、角色原声、暂停、提醒间隔和更换角色操作栏。间隔默认 30 分钟，并可自由输入 1–1440 分钟；角色可在 Haru、Hibiki、Zundamon 间切换，8 秒无操作后自动隐藏。开启“角色原声”后，会播放模型动作自带的语音片段；两个声音开关彼此独立。按住挂件任意非按钮区域即可移动整个窗口；偏好会保存在本机。macOS 会直接检测锁屏状态；电脑休眠或锁屏期间不提醒，恢复使用后重新计时，不会补发旧提醒。其他桌面平台会通过计时器挂起间隔识别休眠恢复。

```bash
pnpm test
pnpm build
pnpm build:desktop
```

`build:desktop` 生成可直接运行的 macOS `.app`；需要分发用磁盘镜像时运行 `pnpm build:dmg`。

## 调整内容

- 提示语：`src/reminders.ts`
- 提醒间隔：`src/reminders.ts` 中的 `REMINDER_INTERVAL_MS`
- 默认模型入口：`src/live2dScene.ts`
- 视觉样式：`src/styles.css`
- 界面预览：`docs/screenshot.jpg`

## Live2D 资源说明

项目默认模型 Haru 和 Cubism Core 来自 Live2D 官方示例资源，仅用于快速验证技术链路。发布或商业使用前，请确认并遵守 [Live2D Free Material License Agreement](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html) 及 Cubism SDK/Core 的对应许可；正式产品建议替换为拥有明确使用权的自有模型。
