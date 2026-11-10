// Scout 창이 서버를 부르는 호출 모음 (도메인/챗봇 §7 화면 통로). 모양의 정본은 서버 chat/routes.ts 다

import { call, json } from './api.js';
import type { 질문 } from './scoutView.js';

export const scoutApi = {
  open: (projectId: number) => call<{ questions: 질문[]; btsUrl: string | null }>(`/chat?projectId=${String(projectId)}`),
  ask: (projectId: number, text: string) => call<{ id: number; ahead: number }>('/chat/questions', json({ projectId, text })),
  stop: (id: number) => call<undefined>(`/chat/questions/${String(id)}/stop`, { method: 'POST' }),
  reset: (projectId: number) => call<undefined>(`/chat?projectId=${String(projectId)}`, { method: 'DELETE' }),
  /** 이어 받기. 끊기면 EventSource 가 마지막 번호(Last-Event-ID)로 스스로 다시 붙는다 */
  stream: (id: number, after: number) => new EventSource(`/api/chat/questions/${String(id)}/stream?after=${String(after)}`),
};
