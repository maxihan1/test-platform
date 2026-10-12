import type { APIRequestContext } from '@playwright/test';

export interface 글내용 {
  category: '자유' | '질문' | '후기';
  title: string;
  content: string;
  images?: string[];
}

export async function 글만들기(api: APIRequestContext, 글: 글내용): Promise<number> {
  const res = await api.post('/api/posts', { data: 글 });
  if (res.status() !== 201) throw new Error(`글 만들기 실패: ${String(res.status())} ${await res.text()}`);
  return ((await res.json()) as { id: number }).id;
}

export async function 글지우기(api: APIRequestContext, id: number): Promise<void> {
  const res = await api.delete(`/api/posts/${String(id)}`);
  if (res.status() !== 204 && res.status() !== 404) throw new Error(`글 지우기 실패: ${String(res.status())}`);
}

export async function 제목으로글찾기(api: APIRequestContext, 제목조각: string): Promise<{ id: number; title: string; authorId?: number }[]> {
  const res = await api.get(`/api/posts?field=title&q=${encodeURIComponent(제목조각)}&size=50`);
  if (!res.ok()) throw new Error(`글 찾기 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: { id: number; title: string; authorId?: number }[] }).items;
}

export async function 지난글치우기(api: APIRequestContext, 제목조각: string): Promise<void> {
  for (const 글 of await 제목으로글찾기(api, 제목조각)) {
    if (글.title.includes(제목조각)) await api.delete(`/api/posts/${String(글.id)}`);
  }
}

export async function 댓글달기(api: APIRequestContext, 글번호: number, content: string, parentId?: number): Promise<number> {
  const res = await api.post(`/api/posts/${String(글번호)}/comments`, { data: parentId === undefined ? { content } : { content, parentId } });
  if (res.status() !== 201) throw new Error(`댓글 달기 실패: ${String(res.status())} ${await res.text()}`);
  return ((await res.json()) as { id: number }).id;
}

export async function 댓글지우기(api: APIRequestContext, id: number): Promise<void> {
  const res = await api.delete(`/api/comments/${String(id)}`);
  if (res.status() !== 204 && res.status() !== 404) throw new Error(`댓글 지우기 실패: ${String(res.status())}`);
}

export async function 알림모두읽기(api: APIRequestContext): Promise<void> {
  const res = await api.post('/api/notifications/read');
  if (!res.ok()) throw new Error(`알림 읽기 실패: ${String(res.status())}`);
}

export function 표식(이름: string): string {
  return `${이름}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
