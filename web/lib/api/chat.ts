import { apiPost } from './client';
import type { components } from '../api-types';

export type RelocationChatRequest = components['schemas']['RelocationChatRequest'];
export type RelocationChatResponse = components['schemas']['RelocationChatResponse'];
export type ChatMessage = components['schemas']['ChatMessage'];
export type ChatCitation = components['schemas']['ChatCitation'];
export type ToolExecutionRecord = components['schemas']['ToolExecutionRecord'];

export async function sendRelocationChatMessage(
  request: RelocationChatRequest,
  signal?: AbortSignal,
): Promise<RelocationChatResponse> {
  return apiPost<RelocationChatResponse>('/relocation/chat', request, signal);
}
