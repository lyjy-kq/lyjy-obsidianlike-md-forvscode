# FlowMD 还原源码阅读指南

本目录由 VSIX 解包产物中的 source map 还原而来，主要用于学习和分析。原始构建产物仍保留在 `../extension/dist` 下。

## 目录说明

- `src/extension`：VS Code 扩展宿主端代码，负责激活扩展、注册命令、创建 Custom Editor、读写 Markdown 文档、导出 HTML、保存图片等。
- `src/webview`：运行在 VS Code Webview 内的浏览器端代码，负责编辑器 UI、Markdown 实时预览、主题适配、图片拖拽、消息处理等。
- `src/webview/codemirror`：CodeMirror 编辑器封装和扩展。
- `src/shared`：扩展端和 Webview 端共享的消息类型、工具函数和配置类型。
- `UPSTREAM_README.md`：VSIX 内原始 README，适合先了解产品功能。

## 推荐阅读顺序

1. `package.json`
    - 先看 `activationEvents`、`contributes.customEditors`、`contributes.commands` 和 `contributes.configuration`。
    - 这里能看到扩展何时启动、提供了哪些命令、有哪些用户配置。

2. `src/extension/index.ts`
    - 扩展入口。
    - 重点看 `activate` 注册了哪些 provider 和 command。

3. `src/extension/editorProvider.ts`
    - Custom Editor 主流程。
    - 重点看文档打开、Webview 创建、扩展端与 Webview 端消息同步。

4. `src/extension/webviewContent.ts`
    - Webview HTML 注入逻辑。
    - 重点看脚本、样式、安全策略和初始化数据如何传给前端。

5. `src/shared/messageTypes.ts`
    - 消息协议中心。
    - 建议先把扩展端和 Webview 端所有消息类型过一遍。

6. `src/webview/main.ts`
    - Webview 入口。
    - 重点看初始化、编辑器创建、消息监听和 UI 状态。

7. `src/webview/codemirror/editor.ts`
    - CodeMirror 封装。
    - 重点看编辑器状态、扩展加载、内容同步和交互行为。

8. `src/webview/codemirror/extensions/livePreview`
    - 实时预览核心。
    - 这里是阅读难点，建议最后看。

## 两条主线

扩展宿主端主线：

```text
index.ts
-> editorProvider.ts
-> webviewContent.ts
-> messageTypes.ts
```

Webview 前端主线：

```text
main.ts
-> messageHandler.ts
-> codemirror/editor.ts
-> codemirror/extensions/livePreview/plugin.ts
```

## 注意事项

- 这是从 source map 还原的阅读版源码，不保证具备完整原始仓库的全部配置文件。
- `package.json` 来自 VSIX 内部，依赖和脚本能帮助理解构建方式，但直接运行构建可能还需要补齐原仓库配置。
- 第三方依赖源码没有还原到本目录，避免干扰学习主线。
