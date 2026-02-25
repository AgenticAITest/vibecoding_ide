import { create } from 'zustand';
import type { AIMessage, AIToolCall, AIImageAttachment } from '@vibecoder/shared';

interface ChatState {
  messages: AIMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  currentAssistantMessage: string;
  currentToolCalls: AIToolCall[];
}

interface ChatActions {
  addUserMessage: (text: string, imageAttachment?: AIImageAttachment) => string;
  setStreaming: (streaming: boolean) => void;
  appendDelta: (delta: string) => void;
  addToolCall: (tc: AIToolCall) => void;
  updateToolCall: (id: string, update: Partial<AIToolCall>) => void;
  finishMessage: () => void;
  setSessionId: (id: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  sessionId: null,
  isStreaming: false,
  currentAssistantMessage: '',
  currentToolCalls: [],

  addUserMessage: (text: string, imageAttachment?: AIImageAttachment) => {
    const id = crypto.randomUUID();
    const msg: AIMessage = {
      id,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      ...(imageAttachment ? { imageAttachment } : {}),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    return id;
  },

  setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),

  appendDelta: (delta: string) => {
    set((s) => ({ currentAssistantMessage: s.currentAssistantMessage + delta }));
  },

  addToolCall: (tc: AIToolCall) => {
    set((s) => ({ currentToolCalls: [...s.currentToolCalls, tc] }));
  },

  updateToolCall: (id: string, update: Partial<AIToolCall>) => {
    set((s) => ({
      currentToolCalls: s.currentToolCalls.map((tc) =>
        tc.id === id ? { ...tc, ...update } : tc
      ),
    }));
  },

  finishMessage: () => {
    const { currentAssistantMessage, currentToolCalls } = get();
    if (!currentAssistantMessage && currentToolCalls.length === 0) return;
    const msg: AIMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: currentAssistantMessage,
      timestamp: Date.now(),
      toolCalls: currentToolCalls.length > 0 ? [...currentToolCalls] : undefined,
    };
    set((s) => ({
      messages: [...s.messages, msg],
      currentAssistantMessage: '',
      currentToolCalls: [],
      isStreaming: false,
    }));
  },

  setSessionId: (id: string) => set({ sessionId: id }),

  clear: () => set({
    messages: [],
    sessionId: null,
    isStreaming: false,
    currentAssistantMessage: '',
    currentToolCalls: [],
  }),
}));
