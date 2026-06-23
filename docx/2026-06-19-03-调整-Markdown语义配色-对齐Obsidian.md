# FlowMD Markdown 语义配色对齐 Obsidian Spec

## 背景

当前 FlowMD 的 Markdown 预览与源码编辑区已经具备完整的语义渲染能力，但标题色和正文语义色仍然沿用现有默认配色，与用户在 Obsidian 中使用的配色不一致。

## 目标

1. 将 Markdown 标题在渲染态和源码态的颜色统一为用户给定配色。
2. 将正文语义元素的颜色统一为用户给定配色。
3. 不修改 Markdown 结构渲染逻辑，不修改组件替换逻辑，不修改交互逻辑。

## 配色要求

### 标题色

- `h1`：`#eb8383`
- `h2`：`#ae9acb`
- `h3`：`#7db5cd`
- `h4`：`#71a796`
- `h5`：`#dcbf61`
- `h6`：`#dda36a`

### 正文语义色

- `strong`：`#d9a37a`
- `em`：`#2bbac5`
- `link`：`#b8f5a2`
- `inline code`：`#f29a9a`

## 范围

包含以下文件的样式调整：

- `src/webview/codemirror/extensions/theme.ts`
- `src/webview/codemirror/extensions/livePreview/styles.ts`

不包含以下内容：

- 代码块结构重写
- Mermaid / 表格 / 脚注 / 数学公式 / 图片等组件逻辑变更
- 导出 HTML 渲染逻辑变更
- 消息协议变更

## 实施方案

1. 在源码编辑区的主题样式中，为 Markdown 标题、strong、em、link、inline code 设置指定颜色。
2. 在 live preview 的 baseTheme 中，为 `.cm-md-heading-*`、`.cm-md-bold`、`.cm-md-italic`、`.cm-md-link`、`.cm-md-code` 设置相同颜色。
3. 保留现有字号、字重、背景色、边距、圆角和链接交互行为，仅替换颜色值。
4. 保留暗色 / 亮色主题下的结构差异，不额外引入新的渲染状态。

## 验收标准

1. Markdown 标题在源码态与预览态显示为指定颜色。
2. `strong`、`em`、链接和行内代码在源码态与预览态显示为指定颜色。
3. 未引入代码块、表格、脚注、数学公式等其他 Markdown 组件的行为变化。
4. `npm run build` 可正常通过。
