import type { APIRequestContext } from '@playwright/test';

export const 테스트글머리 = '[MKT자동]';

export async function 글만들기(req: APIRequestContext, 글: { category?: string; title: string; content?: string }): Promise<number> {
  const res = await req.post('/api/posts', {
    data: { category: 글.category ?? '자유', title: 글.title, content: 글.content ?? '자동 시험이 만든 글입니다. 곧 지워집니다.', images: [] },
  });
  if (!res.ok()) throw new Error(`글 만들기 실패: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { id: number };
  return body.id;
}

export async function 글지우기(req: APIRequestContext, id: number): Promise<number> {
  const res = await req.delete(`/api/posts/${id}`);
  return res.status();
}

export async function 지난글치우기(req: APIRequestContext, 제목머리 = 테스트글머리): Promise<void> {
  const me = await req.get('/api/auth/me');
  if (!me.ok()) return;
  const { id: 내번호 } = (await me.json()) as { id: number };
  const res = await req.get(`/api/posts?field=title&q=${encodeURIComponent(제목머리)}&size=50`);
  if (!res.ok()) return;
  const body = (await res.json()) as { items: { id: number; authorId: number }[] };
  for (const p of body.items) if (p.authorId === 내번호) await req.delete(`/api/posts/${p.id}`);
}

export async function 댓글달기(req: APIRequestContext, postId: number, content: string, parentId: number | null = null): Promise<number> {
  const res = await req.post(`/api/posts/${postId}/comments`, { data: { content, parentId } });
  if (!res.ok()) throw new Error(`댓글 달기 실패: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { id: number };
  return body.id;
}

export async function 댓글지우기(req: APIRequestContext, id: number): Promise<number> {
  const res = await req.delete(`/api/comments/${id}`);
  return res.status();
}
