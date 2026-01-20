# 浏览器 AI 集成 (Browser AI Integration)

## 概述

浏览器 AI 集成功能允许 Zotero AI Butler 通过浏览器插件（如 Tampermonkey 脚本）调用浏览器原生 AI API（如 Chrome AI Prompt API），实现论文分析和问答功能，无需外部 API 密钥。

## 特点

- 🌐 **无需 API 密钥**: 直接使用浏览器内置的 AI 功能
- 🔒 **隐私保护**: 所有数据在本地处理，不发送到外部服务器
- 💰 **完全免费**: 利用浏览器提供的免费 AI 能力
- 🚀 **易于配置**: 只需安装浏览器脚本并选择 Browser AI 提供商

## 系统要求

1. **Chrome 127+** 或支持 AI 功能的兼容浏览器
2. **Tampermonkey** 浏览器扩展
3. **Chrome AI APIs** 已启用（在 `chrome://flags` 中检查 AI 功能）

## 快速开始

### 1. 安装 Tampermonkey

从浏览器扩展商店安装 [Tampermonkey](https://www.tampermonkey.net/)

### 2. 安装桥接脚本

1. 复制 [`docs/browser-ai-integration/zotero-ai-butler-bridge.user.js`](./browser-ai-integration/zotero-ai-butler-bridge.user.js) 的内容
2. 点击 Tampermonkey 图标 → 创建新脚本
3. 粘贴脚本内容并保存
4. 确保脚本已启用

### 3. 配置 Zotero AI Butler

1. 打开 Zotero AI Butler 设置
2. 进入 "API 配置"
3. 选择 "🌐 浏览器 AI (Browser AI)" 作为提供商
4. **重要**: 在 "快捷设置" 中，将 "PDF处理方式" 设置为 "文字提取模式"
5. 点击 "测试连接" 验证配置

### 4. 开始使用

- 右键点击论文 → "召唤AI管家进行分析"
- 浏览器脚本将使用 Chrome AI 处理请求
- 查看实时生成的摘要和分析

## 工作原理

### 通信协议

插件使用 CustomEvent 在 Zotero 和浏览器脚本之间通信：

**Zotero → 浏览器 (请求)**

```javascript
Event: "zotero-ai-butler-request"
Detail: {
  requestId: "req-123...",
  type: "generate" | "chat" | "test",
  payload: { /* 请求数据 */ },
  stream: boolean
}
```

**浏览器 → Zotero (响应)**

```javascript
Event: "zotero-ai-butler-response"
Detail: {
  requestId: "req-123...",
  type: "progress" | "complete" | "error",
  chunk: "...",      // 用于 progress
  result: "...",     // 用于 complete
  error: "..."       // 用于 error
}
```

### 支持的操作

- ✅ **测试连接**: 验证浏览器 AI 是否可用
- ✅ **生成摘要**: 分析论文并生成结构化摘要
- ✅ **多轮对话**: 与 AI 进行问答交互
- ✅ **流式响应**: 实时显示 AI 生成过程

## 限制与注意事项

### PDF 处理模式

⚠️ **重要限制**: 浏览器 AI API 不支持直接处理 Base64 编码的 PDF 文件。

**解决方案**: 必须配置为使用 **"文字提取模式"**

配置步骤：

1. Zotero AI Butler 设置 → 快捷设置
2. 找到 "PDF处理方式"
3. 选择 "文字提取模式" 而非 "多模态处理 Base64"

### 浏览器兼容性

- Chrome 127+ (推荐)
- Edge (基于 Chromium 且支持 AI 功能)
- 其他基于 Chromium 的浏览器（可能需要启用实验性功能）

### 功能限制

- 不支持多文件同时处理
- 依赖浏览器 AI 模型的能力和限制
- 某些高级功能可能不可用（取决于浏览器 AI API）

## 故障排除

### "浏览器 AI 连接失败"

- 确保 Tampermonkey 脚本已安装并启用
- 检查浏览器控制台是否有错误
- 验证 AI API 是否可用: `console.log(window.ai)`

### "Base64 PDF 错误"

- 检查是否已将 PDF 处理方式设置为 "文字提取模式"
- 重新启动 Zotero 使设置生效

### API 不可用

- 更新 Chrome 到 127 或更高版本
- 在 `chrome://flags` 中启用 AI 功能
- 检查 API 可用性: `await window.ai.languageModel.capabilities()`

## 高级配置

### 自定义 AI 参数

在 Tampermonkey 脚本中修改：

- `temperature`: 控制输出的随机性 (0-1)
- `topK`: 采样参数
- `maxTokens`: 最大生成长度

### 调试模式

在浏览器控制台中查看详细日志：

```javascript
// 脚本会自动记录所有请求和响应
// 查看 [Zotero-AI-Butler-Bridge] 前缀的日志
```

## 安全说明

⚠️ 浏览器脚本在网页上下文中运行。请确保：

- 只安装可信的脚本
- 不记录敏感数据
- API 密钥不会暴露给网页
- 通信是本地的（无外部服务器）

## 与其他提供商的比较

| 特性          | Browser AI  | OpenAI | Gemini   | Anthropic |
| ------------- | ----------- | ------ | -------- | --------- |
| 需要 API 密钥 | ❌          | ✅     | ✅       | ✅        |
| 费用          | 免费        | 付费   | 部分免费 | 付费      |
| 隐私          | 完全本地    | 云端   | 云端     | 云端      |
| 多模态支持    | ❌ (仅文本) | ✅     | ✅       | ✅        |
| 模型选择      | 浏览器内置  | 多种   | 多种     | 多种      |
| 网络要求      | 无          | 需要   | 需要     | 需要      |

## 更多信息

详细文档请参阅 [`docs/browser-ai-integration/README.md`](./browser-ai-integration/README.md)

## 常见问题

**Q: 浏览器 AI 的性能如何？**  
A: 取决于浏览器内置模型。通常适合中等长度的论文摘要和基本问答。

**Q: 可以离线使用吗？**  
A: 是的！一旦浏览器 AI 模型下载完成，可以完全离线使用。

**Q: 支持哪些语言？**  
A: 取决于浏览器 AI 模型的能力。Chrome AI 通常支持多种语言，包括中文和英文。

**Q: 会消耗大量资源吗？**  
A: 浏览器 AI 在本地运行，会消耗一些 CPU/GPU 资源，但通常在可接受范围内。

## 贡献

欢迎改进浏览器 AI 集成！如果您有更好的实现方案或发现问题，请：

1. 提交 Issue 描述问题或建议
2. 提交 Pull Request 改进代码
3. 分享您的使用经验和技巧

## 许可证

与主项目相同的 AGPL-3.0-or-later 许可证。
