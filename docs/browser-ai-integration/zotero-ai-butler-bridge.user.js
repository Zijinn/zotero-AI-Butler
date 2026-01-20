// ==UserScript==
// @name         Zotero AI Butler - Browser AI Bridge
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Bridge between Zotero AI Butler and Browser AI APIs (Chrome AI Prompt API)
// @author       AI Butler Team
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  console.log("[Zotero-AI-Butler-Bridge] Script loaded");

  // Check if Browser AI APIs are available
  async function checkAIAvailability() {
    if (!window.ai) {
      console.warn("[Zotero-AI-Butler-Bridge] window.ai not available");
      return false;
    }

    try {
      const capabilities = await window.ai.languageModel.capabilities();
      console.log("[Zotero-AI-Butler-Bridge] AI capabilities:", capabilities);
      return capabilities.available === "readily";
    } catch (error) {
      console.error(
        "[Zotero-AI-Butler-Bridge] Failed to check AI capabilities:",
        error,
      );
      return false;
    }
  }

  // Send response back to Zotero
  function sendResponse(requestId, type, data) {
    const event = new CustomEvent("zotero-ai-butler-response", {
      detail: {
        requestId,
        type,
        ...data,
      },
    });
    window.dispatchEvent(event);
    console.log("[Zotero-AI-Butler-Bridge] Response sent:", {
      requestId,
      type,
    });
  }

  // Handle test connection
  async function handleTest(requestId, payload) {
    try {
      const available = await checkAIAvailability();
      if (!available) {
        sendResponse(requestId, "error", {
          error:
            "Browser AI API is not available. Please ensure Chrome 127+ with AI features enabled.",
        });
        return;
      }

      const capabilities = await window.ai.languageModel.capabilities();
      sendResponse(requestId, "complete", {
        result: `Browser AI is available!\nCapabilities: ${JSON.stringify(capabilities, null, 2)}`,
      });
    } catch (error) {
      sendResponse(requestId, "error", {
        error: `Test failed: ${error.message}`,
      });
    }
  }

  // Handle paper summary generation
  async function handleGenerate(requestId, payload, stream) {
    try {
      const available = await checkAIAvailability();
      if (!available) {
        sendResponse(requestId, "error", {
          error: "Browser AI API is not available",
        });
        return;
      }

      console.log("[Zotero-AI-Butler-Bridge] Generating summary...");

      // Create AI session
      const session = await window.ai.languageModel.create({
        temperature: payload.temperature || 0.7,
        topK: 40,
      });

      // Build prompt
      let fullPrompt = "";
      if (payload.systemPrompt) {
        fullPrompt += payload.systemPrompt + "\n\n";
      }
      if (payload.userPrompt) {
        fullPrompt += payload.userPrompt + "\n\n";
      }

      // Handle PDF content
      if (payload.isBase64) {
        // For base64, we can't directly pass to browser AI
        // User should extract text first or use text-based processing
        fullPrompt +=
          "PDF Content (Base64): [Content provided as base64, please process the extracted text]\n";
        fullPrompt += `Content length: ${payload.content.length} characters\n`;
      } else {
        // Text content
        fullPrompt += "Paper Content:\n" + payload.content;
      }

      // Stream or direct response
      if (stream) {
        const streamResponse = await session.promptStreaming(fullPrompt);
        let fullResponse = "";

        for await (const chunk of streamResponse) {
          fullResponse = chunk;
          sendResponse(requestId, "progress", { chunk });
        }

        sendResponse(requestId, "complete", { result: fullResponse });
      } else {
        const response = await session.prompt(fullPrompt);
        sendResponse(requestId, "complete", { result: response });
      }

      // Clean up
      session.destroy();
    } catch (error) {
      console.error("[Zotero-AI-Butler-Bridge] Generate failed:", error);
      sendResponse(requestId, "error", {
        error: `Generation failed: ${error.message}`,
      });
    }
  }

  // Handle chat/conversation
  async function handleChat(requestId, payload, stream) {
    try {
      const available = await checkAIAvailability();
      if (!available) {
        sendResponse(requestId, "error", {
          error: "Browser AI API is not available",
        });
        return;
      }

      console.log("[Zotero-AI-Butler-Bridge] Starting chat...");

      // Create AI session
      const session = await window.ai.languageModel.create({
        temperature: payload.temperature || 0.7,
        topK: 40,
      });

      // Build conversation history
      let conversationPrompt = "";
      if (payload.conversation && payload.conversation.length > 0) {
        conversationPrompt = "Conversation history:\n";
        for (const msg of payload.conversation) {
          conversationPrompt += `${msg.role}: ${msg.content}\n\n`;
        }
      }

      // Add PDF context if available
      if (payload.pdfContent && !payload.isBase64) {
        conversationPrompt +=
          "\nPaper content:\n" + payload.pdfContent + "\n\n";
      }

      // Get latest user message
      const lastMessage = payload.conversation[payload.conversation.length - 1];
      conversationPrompt += `Please respond to: ${lastMessage.content}`;

      // Stream or direct response
      if (stream) {
        const streamResponse =
          await session.promptStreaming(conversationPrompt);
        let fullResponse = "";

        for await (const chunk of streamResponse) {
          fullResponse = chunk;
          sendResponse(requestId, "progress", { chunk });
        }

        sendResponse(requestId, "complete", { result: fullResponse });
      } else {
        const response = await session.prompt(conversationPrompt);
        sendResponse(requestId, "complete", { result: response });
      }

      // Clean up
      session.destroy();
    } catch (error) {
      console.error("[Zotero-AI-Butler-Bridge] Chat failed:", error);
      sendResponse(requestId, "error", {
        error: `Chat failed: ${error.message}`,
      });
    }
  }

  // Listen for requests from Zotero AI Butler
  window.addEventListener("zotero-ai-butler-request", async (event) => {
    const { requestId, type, payload, stream } = event.detail;

    console.log("[Zotero-AI-Butler-Bridge] Received request:", {
      requestId,
      type,
      stream,
    });

    try {
      switch (type) {
        case "test":
          await handleTest(requestId, payload);
          break;
        case "generate":
          await handleGenerate(requestId, payload, stream);
          break;
        case "chat":
          await handleChat(requestId, payload, stream);
          break;
        default:
          sendResponse(requestId, "error", {
            error: `Unknown request type: ${type}`,
          });
      }
    } catch (error) {
      console.error("[Zotero-AI-Butler-Bridge] Request handler error:", error);
      sendResponse(requestId, "error", {
        error: `Request failed: ${error.message}`,
      });
    }
  });

  console.log("[Zotero-AI-Butler-Bridge] Ready to handle requests");

  // Notify Zotero that the bridge is ready
  window.addEventListener("load", () => {
    const readyEvent = new CustomEvent("zotero-ai-butler-bridge-ready", {
      detail: { version: "1.0.0" },
    });
    window.dispatchEvent(readyEvent);
    console.log("[Zotero-AI-Butler-Bridge] Bridge ready");
  });
})();
