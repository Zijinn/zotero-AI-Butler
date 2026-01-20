# Browser AI Integration - Tampermonkey Script

This directory contains example scripts for integrating Zotero AI Butler with browser-native AI APIs through Tampermonkey or similar browser extensions.

## Prerequisites

1. **Chrome 127+** or compatible browser with AI features enabled
2. **Tampermonkey** browser extension installed
3. **Chrome AI APIs** enabled (check `chrome://flags` for AI features)

## Installation

1. Install Tampermonkey from your browser's extension store
2. Copy the script from `zotero-ai-butler-bridge.user.js`
3. Click the Tampermonkey icon → Create new script
4. Paste the script content and save
5. Ensure the script is enabled

## Configuration in Zotero AI Butler

1. Open Zotero AI Butler settings
2. Go to "API 配置" (API Configuration)
3. Select "🌐 浏览器 AI (Browser AI)" as provider
4. Click "测试连接" (Test Connection) to verify

## How It Works

The integration uses CustomEvents for communication between Zotero and the browser script:

### 1. Zotero → Browser (Request)

```javascript
Event: "zotero-ai-butler-request"
Detail: {
  requestId: "req-123...",
  type: "generate" | "chat" | "test",
  payload: { /* request data */ },
  stream: boolean
}
```

### 2. Browser → Zotero (Response)

```javascript
Event: "zotero-ai-butler-response"
Detail: {
  requestId: "req-123...",
  type: "progress" | "complete" | "error",
  chunk: "...",      // for progress
  result: "...",     // for complete
  error: "..."       // for error
}
```

## Browser AI APIs

The script can use various browser AI APIs:

### Chrome AI Prompt API (Recommended)

```javascript
const session = await window.ai.languageModel.create({
  temperature: 0.7,
  topK: 40,
});
const response = await session.prompt(text);
```

### Chrome Translation API

```javascript
const translator = await window.translation.createTranslator({
  sourceLanguage: "en",
  targetLanguage: "zh",
});
```

### Chrome Summarization API

```javascript
const summarizer = await window.ai.summarizer.create();
const summary = await summarizer.summarize(text);
```

## Troubleshooting

### "Browser AI connection failed"

- Ensure Tampermonkey script is installed and enabled
- Check browser console for errors
- Verify AI APIs are available: `console.log(window.ai)`

### No response from browser AI

- Check if the script is running on the correct page
- Verify event listeners are active
- Check browser console for event dispatch

### API not available

- Update Chrome to version 127+
- Enable AI features in `chrome://flags`
- Check API availability: `await window.ai.languageModel.capabilities()`

### Base64 PDF Error

⚠️ **Important**: Browser AI APIs do not support direct Base64 PDF processing.
When using Browser AI provider, you **must** configure Zotero AI Butler to use **"文字提取模式" (Text Extraction Mode)** instead of "多模态处理 Base64" in the PDF processing settings.

To configure:

1. Open Zotero AI Butler settings
2. Go to "快捷设置" (Quick Settings)
3. Find "PDF处理方式" (PDF Processing Mode)
4. Select "文字提取模式" (Text Extraction Mode)

## Example Usage

```javascript
// In Zotero AI Butler, select Browser AI provider
// Right-click a paper → "召唤AI管家进行分析"
// The browser script will handle the request using Chrome AI
```

## Security Note

⚠️ The browser script operates in the web page context. Ensure:

- Only trusted scripts are installed
- No sensitive data is logged
- API keys are never exposed to the web page
- Communication is local (no external servers)

## Advanced Configuration

You can customize the script behavior by modifying:

- AI model parameters (temperature, topK, maxTokens)
- Response streaming settings
- Error handling and retries
- Logging verbosity

See `zotero-ai-butler-bridge.user.js` for implementation details.
