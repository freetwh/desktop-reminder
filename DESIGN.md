# Design System: 姿态提醒（personal-reminder）

**来源：** 从代码库现有实现（`src/styles.css`、`src/App.tsx`）梳理，目标方向为「智能硬件状况监控」仪器风格。所有取值的唯一事实来源是 [src/styles/tokens.css](src/styles/tokens.css)，本文档解释每个决策的「为什么」。

---

## 1. Visual Theme & Atmosphere

**一句话：这不是一个「可爱的桌面宠物 UI」，而是一台会提醒你的桌面仪器，恰好住着一个 Live2D 角色。**

- **气质关键词：** 沉静、精密、克制、可读。像录音棚的电平表、相机的肩屏——大部分时间是黑的，只有状态和读数在发光。
- **密度：** 中高。控件密集排列，但用发丝线和留白分组，不靠卡片套卡片。
- **明暗策略：** 挂件浮在任意壁纸之上，因此所有界面铬件（dock、气泡、面板）统一走「近黑半透明 + 背景模糊」，保证在亮色或杂乱壁纸上都可读。角色本身保持透明无框，是画面中唯一的「活物」；界面的职责是退后，只在你需要时亮起。
- **「AI 味」减法原则：** 无渐变装饰、无蓝紫默认色、无大圆角玻璃卡片、无 emoji 图标、无无意义的入场飘浮。一切视觉元素必须对应一个真实状态或读数（倒计时、间隔分钟数、缩放百分比、静音/暂停状态）。

## 2. Color Palette & Roles

### 底色 · 仪器面板（Ink）

| 名称 | 值 | 角色 |
|---|---|---|
| 深渊近黑 Abyss Ink（`#0A0B0D`） | `--ink-0` | 面板基底色，实际使用 82% 透明度（`--panel-fill`）压在壁纸上 |
| 面板碳灰 Panel Charcoal（`#121316`） | `--ink-1` | 面板表面，94% 透明度用于需要更强遮蔽的浮层 |
| 抬升石墨 Raised Graphite（`#17191D`） | `--ink-2` | 内嵌控件、hover 抬升面 |
| 发丝边线 Hairline Slate（`#262A31`） | `--hairline` | 唯一的分隔手段：1px 边线，取代投影和卡片嵌套 |

### 信号与状态（Signal / Status）

全界面**只允许一个主信号色**。状态色有语义分工，绝不用于装饰。

| 名称 | 值 | 角色 |
|---|---|---|
| 暖琥珀信号 Warm Amber Signal（`#FF9E40`） | `--signal` | 唯一强调色：主操作、激活态、当前读数、OK 键。选暖琥珀而非冷蓝，是为了和 Live2D 角色的暖色调共存不打架 |
| 薄荷运行绿 Mint Operational（`#34D399`） | `--status-ok` | 监测中的 LED 呼吸点 |
| 灰蓝提示 Pass Blue（`#5FA8C7`） | `--status-info` | 试听、提示类非关键反馈 |
| 暗金警告 Muted Gold Warn（`#D9A24A`） | `--status-warn` | 暂停态。与 signal 拉开明度差距，避免两种琥珀混淆 |
| 砖红警报 Brick Alert（`#D85C46`） | `--status-alert` | 仅用于「退出挂件」等不可逆/危险操作 |
| 冷灰关闭 Cold Off-Grey（`#69707A`） | `--status-off` | 禁用、静音、关闭态 |

### 文字层级

| 名称 | 值 | 角色 |
|---|---|---|
| 读数白 Readout White（`#FBFBFB`） | `--text-primary` | 倒计时、百分比等一切数字读数 |
| 雾灰正文 Mist Grey（`#B8BCC4`） | `--text-muted` | 气泡正文、次要说明 |
| 烟灰标签 Smoke Faint（`#69707A`） | `--text-faint` | 标签、单位、刻度 |

**为什么不用旧的玫瑰粉（#C9877F）+ 半透白玻璃：** 粉彩 + 白玻璃是「生活方式 App」的默认审美，在桌面壁纸上对比度不稳定，也是 AI 生成界面的高频套路。近黑仪器面板在任何壁纸上都稳定，且让琥珀读数真正「亮」起来。

## 3. Typography Rules

- **双字体制：**
  - `--font-mono`（SF Mono → JetBrains Mono → ui-monospace → PingFang SC）：一切**数字读数、倒计时、百分比、单位**。等宽 + tabular 数字让倒计时不抖动，这是「仪器感」的第一来源。
  - `--font-ui`（PingFang SC → Microsoft YaHei → system-ui）：气泡文案、按钮名等中文正文。
- **标签三件套（小型化处理）：** 9–10px 字号 + 大写（拉丁）+ 加宽字距（拉丁 0.14em / 中文 0.05em）。层级靠字号、字重、字距建立，不靠颜色深浅堆。
- **读数：** 15px、字重 600、字距 −0.01em，微微收紧显得精密。
- **中文纪律：** 中文不使用斜体（无真斜体，机械倾斜伤可读性）；需要强调时用字重或 signal 色。

## 4. Component Stylings

- **提醒气泡 →「告警读数条」：** 深面板（`--panel-fill` + 14px 模糊）+ 左侧 3px 琥珀 accent bar 标示「这是一条提醒」；右侧附等宽倒计时读数（自动消失前的剩余秒数）；确认键是琥珀底深色字的小号直角药丸，文案用「收到」而非「OK」。圆角上限 12px，不做气泡尾巴——它是仪器读数，不是漫画对话框。
- **控制坞 →「控制条 Console Strip」：** 单行九格，深面板 + 1px 发丝边线；每个按钮 = 图标 + 9px 大写标签 + 顶部 2px 状态 LED 点（运行=薄荷绿呼吸 / 暂停=暗金常亮 / 静音=冷灰熄灭 / 激活=琥珀）。状态一眼扫 LED 即可，不需要读文字。
- **浮层（间隔 / 角色 / 缩放）：** 与控制条同材质，左上角带编号标记（如 `01 / INTERVAL`）建立编辑节奏；输入框用 `--ink-2` 底 + 发丝线，focus 时边线变 `--hairline-strong` + 一圈 `--signal-glow` 微光，不用粗蓝框。
- **滑杆：** 轨道 4px 发丝圆角，已走部分填 signal 琥珀，拇指是 12px 实心圆 + 1px 边线，hover 时带 `--glow-signal` 微光——像真实电位器，不做大号白色拇指。
- **深度规则：** 全项目只允许一种投影（`--raise-panel`，轻微的黑色下沉影，用来在壁纸上定住面板）+ 一组彩色微光（glow，仅表达「活性」）。禁止投影套投影。

## 5. Layout Principles

- **4px 基网：** 所有间距取 `--sp-1`（4）到 `--sp-4`（16），面板内边距固定 12px。
- **三段式垂直结构（自下而上）：** 控制条（底部 10px）→ Live2D 舞台（居中）→ 告警读数条（角色头顶）。浮层面板永远出现在控制条正上方 61px 处，位置记忆一致。
- **宽度纪律：** 控制条 320px / 浮层 312px，所有面板同轴居中，不做随机宽度。
- **分隔只靠发丝线：** 组件之间用 1px `--hairline` 或 8px 以上的留白分组；禁止面板套面板。
- **隐藏即退场：** 界面铬件 8 秒无操作整体隐去，只留下角色——仪器的默认状态是「待机黑屏」，不是常亮的仪表盘。

## 6. Motion Rules

| 场景 | 参数 | 说明 |
|---|---|---|
| hover / 按下反馈 | 120ms `--ease-standard` | 快而短，模拟物理开关 |
| 面板 / 气泡入场 | 240ms `--ease-reveal` | 明显减速曲线，到位即停，不弹 |
| 运行 LED 脉冲 | 1.4s ease-in-out 循环 | 唯一的「活」指示 |
| 激活态呼吸微光 | 3.4s 循环 | 与 LED 脉冲错开周期，避免整齐划一的机械感 |

两条铁律：**动画必须携带信息**（LED 闪 = 监测中；呼吸 = 等你确认）；**`prefers-reduced-motion` 下一律静止**（tokens.css 已内置）。

## 7. 去 AI 味清单（评审新界面时逐条核对）

1. 出现了渐变 → 删掉，除非它是数据本身（如电平条）。
2. 出现了蓝紫 / 青色霓虹 → 换回琥珀 signal 或发丝灰。
3. 圆角超过 12px、或出现药丸形大按钮 → 收到 8px 以内。
4. 数字没有用等宽字体 → 改 `--font-mono`。
5. 有元素在动但说不出它代表什么状态 → 删动画。
6. 出现卡片套卡片、阴影套阴影 → 改发丝线 + 留白。
7. 文案出现「强大的」「优雅的」「无缝的」→ 改成具体读数或状态。
8. 图标是 emoji 或彩色圆角方块 → 换 1.5px 描边线性图标（Lucide）。

---

## 附：Token 速查

全部 token 定义见 [src/styles/tokens.css](src/styles/tokens.css)。使用约定：

```css
/* ✅ 正确：只引用 token */
.my-panel {
  background: var(--panel-fill);
  border: var(--stroke) solid var(--hairline);
  border-radius: var(--r-lg);
  color: var(--text-muted);
  font: var(--fw-label) var(--fs-label) var(--font-mono);
  letter-spacing: var(--track-label);
  transition: color var(--dur-instant) var(--ease-standard);
}

/* ❌ 禁止：就地写死数值 */
.my-panel { background: rgba(10,11,13,.8); border-radius: 16px; }
```

新增状态色前，先检查是否已有语义对应（ok / info / warn / alert / off）；确实需要新色时，从 signal 琥珀的同温层推导（同饱和度、拉开明度），不引入新色相。
