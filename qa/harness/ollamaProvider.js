import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SafetyGuard } from '../core/safetyGuard.js';

/**
 * Open-QA Native Ollama Provider
 * Connects Open-QA's Playwright MCP Server to the local Ollama LLM endpoint.
 * Ensures ₹0 cost, zero cloud APIs, and full local inference.
 */
export function ollamaProvider(options = {}) {
  const host = options.host || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  const model = options.model || process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const safetyGuard = new SafetyGuard(process.env);
  const maxIterations = options.maxIterations || 8;

  return {
    name: 'ollama-native',
    model,

    async run(prompt, { mcpUrl, verbose, logger }) {
      if (verbose) {
        logger?.log(`🦙 Open-QA connecting to local Ollama (${model}) at ${host}...\n`);
      }

      // 1. Verify Ollama Host is strictly local
      const parsedUrl = new URL(host);
      if (parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
        throw new Error(`Security Violation: Ollama host must be local! Attempted: ${host}`);
      }

      // 2. Connect to Open-QA's Playwright MCP Server
      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
      const mcpClient = new Client({ name: 'openqa-ollama-agent', version: '1.0.0' });
      await mcpClient.connect(transport);

      // 3. Discover available tools from Open-QA
      const toolsResponse = await mcpClient.listTools();
      const openqaTools = toolsResponse.tools || [];

      // Convert MCP tools to Ollama function calling format
      const ollamaTools = openqaTools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema || { type: 'object', properties: {} },
        },
      }));

      const messages = [
        {
          role: 'system',
          content:
            'You are an autonomous QA test agent operating a live web browser using Playwright tools. ' +
            'Inspect the page, follow instructions, call the appropriate browser tool to navigate or click or fill inputs, and verify outcomes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      let iteration = 0;
      let finalSummary = '';
      const executedSteps = [];

      try {
        while (iteration < maxIterations) {
          iteration++;

          // Call local Ollama
          const response = await fetch(`${host}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages,
              tools: ollamaTools,
              temperature: 0.1,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama HTTP ${response.status}: ${errText}`);
          }

          const completion = await response.json();
          const choice = completion.choices?.[0];
          if (!choice) break;

          const assistantMsg = choice.message;
          messages.push(assistantMsg);

          // Check for Tool Calls
          if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
            for (const toolCall of assistantMsg.tool_calls) {
              const toolName = toolCall.function.name;
              let toolArgs = {};
              try {
                toolArgs = typeof toolCall.function.arguments === 'string'
                  ? JSON.parse(toolCall.function.arguments)
                  : toolCall.function.arguments || {};
              } catch {
                toolArgs = {};
              }

              // Safety Guard Check
              const actionDesc = `${toolName} ${JSON.stringify(toolArgs)}`;
              const safety = safetyGuard.checkSafety(actionDesc);

              let toolResultContent = '';
              if (!safety.safe) {
                if (verbose) logger?.log(`🛡️ SAFETY BLOCKED: ${safety.reason}`);
                toolResultContent = `ACTION_BLOCKED: ${safety.reason}`;
              } else {
                if (verbose) logger?.log(`🔧 Open-QA Executing Tool: ${toolName}`);
                try {
                  const callOutput = await mcpClient.callTool({
                    name: toolName,
                    arguments: toolArgs,
                  });
                  toolResultContent = JSON.stringify(callOutput);
                  executedSteps.push({ tool: toolName, args: toolArgs, success: true });
                } catch (toolErr) {
                  toolResultContent = `Error: ${toolErr.message}`;
                  executedSteps.push({ tool: toolName, args: toolArgs, success: false, error: toolErr.message });
                }
              }

              // Feed tool result back to model
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResultContent,
              });
            }
          } else {
            // Model finished with textual response
            finalSummary = assistantMsg.content || '';
            if (verbose) logger?.log(`💬 Agent Response: ${finalSummary}`);
            break;
          }
        }
      } finally {
        await mcpClient.close().catch(() => {});
      }

      return {
        result: finalSummary || `Completed ${executedSteps.length} autonomous exploratory actions.`,
        steps: executedSteps,
        model,
      };
    },
  };
}
