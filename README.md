# Lyjy ObsidianLike MD for VS Code

一个面向 VS Code 的 Markdown 编辑器扩展，主打 Obsidian 风格的实时预览、右侧大纲、可拖动分栏和更贴近编辑器的阅读体验。

## 项目仓库

- GitHub: [lyjy-kq/lyjy-obsidianlike-md-forvscode](https://github.com/lyjy-kq/lyjy-obsidianlike-md-forvscode)
- Issues: [提交问题](https://github.com/lyjy-kq/lyjy-obsidianlike-md-forvscode/issues)
- README: [项目说明](https://github.com/lyjy-kq/lyjy-obsidianlike-md-forvscode#readme)

## 功能

- Markdown 实时编辑与预览
- 右侧大纲导航
- 可拖动并持久化保存的大纲宽度
- `Ctrl + 滚轮` 调整正文缩放，并自动保存字号
- 行号、自动换行、可读行宽设置
- 图片插入、导出 HTML、主题适配

## 安装与开发

```bash
npm install
npm run build
```

## 从 release 安装 VSIX

如果你从 `release` 下载到了 `lyjy-obsidianlike-md-0.3.11.vsix` 文件，可以按下面步骤安装到 VS Code：

1. 打开 VS Code。
2. 按 `Ctrl+Shift+P` 打开命令面板。
3. 输入并选择 `Extensions: Install from VSIX...`
4. 选择你下载的 `lyjy-obsidianlike-md-0.3.11.vsix` 文件。
5. 安装完成后，执行 `Developer: Reload Window` 重载窗口。

如果没有立刻生效，也可以直接重启 VS Code 一次。

打包后的扩展入口位于 `dist/extension.js`。

## 说明

项目灵感来自 FlowMD，感谢原项目提供的思路。
