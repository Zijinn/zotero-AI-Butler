import { ILlmProvider } from "./ILlmProvider";
import { ConversationMessage, LLMOptions, ProgressCb } from "./types";
import { SYSTEM_ROLE_PROMPT } from "../../utils/prompts";

/**
 * BrowserAIProvider - 浏览器 AI 提供商
 *
 * 该提供商通过浏览器插件（如 Tampermonkey）调用浏览器原生 AI API（如 Chrome AI Prompt API）
 * 来实现论文的问答功能。
 *
 * 工作原理:
 * 1. Zotero 插件通过全局对象暴露接口给浏览器插件
 * 2. 浏览器插件接收 Zotero 插件发送的请求
 * 3. 浏览器插件调用浏览器原生 AI API (如 window.ai.languageModel.create())
 * 4. 浏览器插件将 AI 响应返回给 Zotero 插件
 *
 * 通信协议:
 * - 使用 CustomEvent 进行跨上下文通信
 * - Zotero 插件发送 "zotero-ai-butler-request" 事件
 * - 浏览器插件监听该事件并处理请求
 * - 浏览器插件通过 "zotero-ai-butler-response" 事件返回结果
 */
export class BrowserAIProvider implements ILlmProvider {
  readonly id = "browser-ai";
  private static readonly DEFAULT_TIMEOUT_MS = 300000; // 5分钟默认超时
  private requestTimeout = BrowserAIProvider.DEFAULT_TIMEOUT_MS;

  /**
   * 获取浏览器窗口对象
   * 在 Zotero 插件环境中安全获取 window 对象
   */
  private getWindow(): Window | null {
    return Zotero.getMainWindow() || (globalThis as any).window || null;
  }

  /**
   * 发送请求到浏览器插件
   */
  private async sendToBrowserAI(
    type: "generate" | "chat" | "test",
    payload: any,
    onProgress?: ProgressCb,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}-${Math.random()}`;
      const progressChunks: string[] = [];

      // Get window from global context
      const win = this.getWindow();
      if (!win) {
        reject(new Error("无法访问浏览器窗口对象"));
        return;
      }

      // 监听响应事件
      const responseHandler = (event: CustomEvent) => {
        const data = event.detail;
        if (data.requestId !== requestId) return;

        if (data.type === "progress" && onProgress) {
          // 处理流式响应
          progressChunks.push(data.chunk);
          onProgress(data.chunk);
        } else if (data.type === "complete") {
          // 请求完成
          clearTimeout(timeoutId);
          win.removeEventListener(
            "zotero-ai-butler-response",
            responseHandler as EventListener,
          );
          resolve(data.result || progressChunks.join(""));
        } else if (data.type === "error") {
          // 请求失败
          clearTimeout(timeoutId);
          win.removeEventListener(
            "zotero-ai-butler-response",
            responseHandler as EventListener,
          );
          reject(new Error(data.error || "浏览器 AI 请求失败"));
        }
      };

      win.addEventListener(
        "zotero-ai-butler-response",
        responseHandler as EventListener,
      );

      // 设置超时
      const timeoutId = win.setTimeout(() => {
        win.removeEventListener(
          "zotero-ai-butler-response",
          responseHandler as EventListener,
        );
        reject(new Error("浏览器 AI 请求超时"));
      }, this.requestTimeout);

      // 发送请求事件
      const requestEvent = new CustomEvent("zotero-ai-butler-request", {
        detail: {
          requestId,
          type,
          payload,
          stream: !!onProgress,
        },
      });
      win.dispatchEvent(requestEvent);

      ztoolkit.log(`[AI-Butler][BrowserAI] 发送请求到浏览器插件: ${requestId}`);
    });
  }

  /**
   * 生成论文摘要
   */
  async generateSummary(
    content: string,
    isBase64: boolean,
    prompt: string | undefined,
    options: LLMOptions,
    onProgress?: ProgressCb,
  ): Promise<string> {
    if (options.requestTimeoutMs) {
      this.requestTimeout = options.requestTimeoutMs;
    }

    const systemPrompt = SYSTEM_ROLE_PROMPT;
    const userPrompt = prompt || "请总结这篇论文的主要内容。";

    const payload = {
      systemPrompt,
      userPrompt,
      content,
      isBase64,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
    };

    ztoolkit.log(`[AI-Butler][BrowserAI] 生成摘要请求, base64: ${isBase64}`);

    return this.sendToBrowserAI("generate", payload, onProgress);
  }

  /**
   * 对话功能
   */
  async chat(
    pdfContent: string,
    isBase64: boolean,
    conversation: ConversationMessage[],
    options: LLMOptions,
    onProgress?: ProgressCb,
  ): Promise<string> {
    if (options.requestTimeoutMs) {
      this.requestTimeout = options.requestTimeoutMs;
    }

    const payload = {
      pdfContent,
      isBase64,
      conversation,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
    };

    ztoolkit.log(
      `[AI-Butler][BrowserAI] 对话请求, 历史消息数: ${conversation.length}`,
    );

    return this.sendToBrowserAI("chat", payload, onProgress);
  }

  /**
   * 测试连接
   */
  async testConnection(options: LLMOptions): Promise<string> {
    ztoolkit.log(`[AI-Butler][BrowserAI] 测试连接`);

    try {
      const result = await this.sendToBrowserAI("test", {
        message: "Hello from Zotero AI Butler",
      });
      return `浏览器 AI 连接成功！\n响应: ${result}`;
    } catch (error) {
      throw new Error(
        `浏览器 AI 连接失败: ${error instanceof Error ? error.message : String(error)}\n\n` +
          `请确保:\n` +
          `1. 浏览器支持 AI API (如 Chrome 127+ with AI features enabled)\n` +
          `2. 已安装并启用了相应的浏览器插件（如 Tampermonkey 脚本）\n` +
          `3. 浏览器插件正在监听 "zotero-ai-butler-request" 事件`,
      );
    }
  }
}

// 自注册
import { ProviderRegistry } from "./ProviderRegistry";
ProviderRegistry.register(new BrowserAIProvider());

export default BrowserAIProvider;
