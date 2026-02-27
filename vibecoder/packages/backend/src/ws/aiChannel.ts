import { WebSocket } from 'ws';
import path from 'path';
import { readFile } from 'fs/promises';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { WSMessage, AIStreamEvent } from '@vibecoder/shared';
import { getProjectDir } from '../services/fileSystem.js';

async function readProjectClaudeMd(): Promise<string> {
  try {
    const claudeMdPath = path.join(getProjectDir(), 'CLAUDE.md');
    return await readFile(claudeMdPath, 'utf-8');
  } catch {
    return '';
  }
}

interface ActiveQuery {
  abortController: AbortController;
}

const activeQueries = new Map<WebSocket, ActiveQuery>();

function sendAiEvent(ws: WebSocket, event: AIStreamEvent) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const msg: WSMessage = {
    channel: 'ai',
    type: `ai:${event.type}`,
    payload: event,
  };
  ws.send(JSON.stringify(msg));
}

export async function handleAiMessage(ws: WebSocket, msg: WSMessage) {
  switch (msg.type) {
    case 'ai:send':
      await handleSend(ws, msg.payload as { message: string; sessionId?: string; imagePath?: string });
      break;
    case 'ai:interrupt':
      handleInterrupt(ws);
      break;
  }
}

async function handleSend(ws: WebSocket, payload: { message: string; sessionId?: string; imagePath?: string }) {
  console.log('[AI] handleSend called:', payload.message.slice(0, 80));
  // Abort any existing query on this connection
  handleInterrupt(ws);

  const abortController = new AbortController();
  activeQueries.set(ws, { abortController });

  // If an image was attached, augment the prompt so Claude CLI reads it
  let prompt = payload.message;
  if (payload.imagePath) {
    const absolutePath = path.join(getProjectDir(), payload.imagePath);
    prompt += `\n\n[The user has attached an image file. Read and analyze it: ${absolutePath}]`;
  }

  try {
    console.log('[AI] Starting query...');
    const claudeMdContent = await readProjectClaudeMd();
    const q = query({
      prompt,
      options: {
        cwd: getProjectDir(),
        includePartialMessages: true,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        abortController,
        env: { CLAUDECODE: undefined },
        settingSources: [],
        ...(claudeMdContent ? {
          systemPrompt: {
            type: 'preset' as const,
            preset: 'claude_code' as const,
            append: claudeMdContent,
          },
        } : {}),
        stderr: (data: string) => console.error('[AI stderr]', data),
        ...(payload.sessionId ? { resume: payload.sessionId } : {}),
      },
    });
    console.log('[AI] Query created, iterating...');

    let currentToolName = '';
    let currentToolId = '';
    let toolInputJson = '';

    for await (const message of q) {
      console.log('[AI] Message:', message.type, 'subtype' in message ? (message as { subtype?: string }).subtype : '');
      if (ws.readyState !== WebSocket.OPEN) break;

      if (message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
        sendAiEvent(ws, { type: 'init', sessionId: message.session_id });
      } else if (message.type === 'stream_event') {
        const event = message.event;

        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolName = event.content_block.name;
            currentToolId = event.content_block.id;
            toolInputJson = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            sendAiEvent(ws, { type: 'text', delta: event.delta.text });
          } else if (event.delta.type === 'input_json_delta') {
            toolInputJson += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolName) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(toolInputJson || '{}');
            } catch { /* ignore parse errors */ }
            sendAiEvent(ws, {
              type: 'toolUse',
              id: currentToolId,
              tool: currentToolName,
              args,
            });
            currentToolName = '';
            currentToolId = '';
            toolInputJson = '';
          }
        }
      } else if (message.type === 'assistant') {
        // Complete assistant message — check for tool results
        for (const block of message.message.content) {
          if (block.type === 'tool_result' && 'tool_use_id' in block) {
            const content = typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? block.content.map((c: { text?: string }) => c.text || '').join('')
                : '';
            sendAiEvent(ws, {
              type: 'toolResult',
              id: (block as { tool_use_id: string }).tool_use_id,
              tool: '',
              output: content,
            });
          }
        }
      } else if (message.type === 'result') {
        if (message.subtype === 'success') {
          sendAiEvent(ws, {
            type: 'done',
            cost: message.total_cost_usd,
            usage: message.usage ? {
              input: message.usage.input_tokens,
              output: message.usage.output_tokens,
            } : undefined,
          });
        } else {
          sendAiEvent(ws, {
            type: 'error',
            message: 'errors' in message ? (message.errors as string[]).join('; ') : 'Unknown error',
          });
        }
      }
    }
  } catch (err) {
    console.error('[AI] Error:', err);
    if ((err as Error).name === 'AbortError') return;
    sendAiEvent(ws, {
      type: 'error',
      message: (err as Error).message || 'Unknown error',
    });
  } finally {
    activeQueries.delete(ws);
  }
}

function handleInterrupt(ws: WebSocket) {
  const active = activeQueries.get(ws);
  if (active) {
    active.abortController.abort();
    activeQueries.delete(ws);
  }
}

export function cleanupConnection(ws: WebSocket) {
  handleInterrupt(ws);
}
