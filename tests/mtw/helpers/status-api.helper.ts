import type { Page } from '@playwright/test';

import { apiDelete, apiGet, apiPost, 글지우기API, 내계정API, 몸, 토큰, type 글 } from './api.helper.js';
import type { 올릴파일 } from './media.helper.js';

const 작은영상본문 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAANlbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAyAAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAo90cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAMgAAAQAAABAAAAAAIHbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAIABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABsm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAXJzdGJsAAAAwnN0c2QAAAAAAAAAAQAAALJhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAOGF2Y0MBZAAK/+EAGmdkAAqscgREJsBEAAADAAQAAAMAKDxIlhGAAQAHaOhDg5LIsP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAeAAAAHgAAAAAYc3R0cwAAAAAAAAABAAAABAAACAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAAChjdHRzAAAAAAAAAAMAAAABAAAQAAAAAAEAACAAAAAAAgAACAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAALZAAAADQAAAA0AAAANAAAAFHN0Y28AAAAAAAAAAQAAA5UAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU4Ljc2LjEwMAAAAAhmcmVlAAADCG1kYXQAAAKvBgX//6vcRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTYzIHIzMDYwIDVkYjZhYTYgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDIxIC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MSByZWY9MTYgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDEzMyBtZT11bWggc3VibWU9MTAgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0yNCBjaHJvbWFfbWU9MSB0cmVsbGlzPTIgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0yIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9OCBiX3B5cmFtaWQ9MiBiX2FkYXB0PTIgYl9iaWFzPTAgZGlyZWN0PTMgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj01IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NjAgcmM9Y3JmIG1idHJlZT0xIGNyZj00MC4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAImWIgQACX/47s8Cl3OhOIePD8dYRqouJLMls5PqY307jL4EAAAAJQZoIbYh//wExAAAACUGeECcQQ/84IQAAAAkBnhhNSH//O6A=';

export interface 글상태 {
  reblogged: boolean;
  favourited: boolean;
  bookmarked: boolean;
  pinned: boolean | null;
  reblogs_count: number;
  favourites_count: number;
  quotes_count: number;
  spoiler_text: string;
}

export interface 투표글 {
  id: string;
  url: string;
  pollId: string;
}

export interface 시도결과 {
  상태: number;
  오류: string;
  글번호: string | undefined;
}

export function 작은영상(이름: string): 올릴파일 {
  return { name: 이름, mimeType: 'video/mp4', buffer: Buffer.from(작은영상본문, 'base64') };
}

export async function 비회원글찾기API(page: Page, 아이디: string, 글조각: string): Promise<글> {
  const 계정 = (await (await page.request.get(`/api/v1/accounts/lookup?acct=${encodeURIComponent(아이디)}`)).json()) as { id: string };
  const 목록 = (await (await page.request.get(`/api/v1/accounts/${계정.id}/statuses?limit=40`)).json()) as 글[];
  const 찾음 = 목록.find((s) => s.content.includes(글조각));
  if (찾음 === undefined) throw new Error(`${아이디} 의 공개 글에서 「${글조각}」을 못 찾았다`);
  return 찾음;
}

export async function 글상태API(page: Page, 글번호: string): Promise<글상태> {
  return 몸<글상태>(await apiGet(page, `/api/v1/statuses/${글번호}`));
}

export async function 반응풀기API(page: Page, 글번호: string): Promise<void> {
  for (const 동작 of ['unfavourite', 'unbookmark', 'unreblog']) await apiPost(page, `/api/v1/statuses/${글번호}/${동작}`);
}

export async function 고정API(page: Page, 글번호: string): Promise<void> {
  await 몸<글>(await apiPost(page, `/api/v1/statuses/${글번호}/pin`));
}

export async function 고정풀기API(page: Page, 글번호: string): Promise<void> {
  await apiPost(page, `/api/v1/statuses/${글번호}/unpin`);
}

export async function 필터지우기API(page: Page, 제목: string): Promise<void> {
  const 목록 = await 몸<{ id: string; title: string }[]>(await apiGet(page, '/api/v2/filters'));
  for (const 필터 of 목록.filter((f) => f.title === 제목)) await apiDelete(page, `/api/v2/filters/${필터.id}`);
}

export async function 투표글쓰기API(page: Page, 본문: string, 선택지 = ['가', '나']): Promise<투표글> {
  const 응답 = await 몸<글 & { poll: { id: string } }>(
    await apiPost(page, '/api/v1/statuses', { status: 본문, visibility: 'public', poll: { options: 선택지, expires_in: 3600 } }),
  );
  return { id: 응답.id, url: 응답.url, pollId: 응답.poll.id };
}

export async function 투표참여API(page: Page, 투표번호: string, 선택: number): Promise<void> {
  await 몸<unknown>(await apiPost(page, `/api/v1/polls/${투표번호}/votes`, { choices: [선택] }));
}

export async function 미디어올리기API(page: Page, 파일: 올릴파일): Promise<string> {
  const 응답 = await page.request.post('/api/v2/media', {
    headers: { Authorization: `Bearer ${await 토큰(page)}` },
    multipart: { file: { name: 파일.name, mimeType: 파일.mimeType, buffer: 파일.buffer } },
  });
  return (await 몸<{ id: string }>(응답)).id;
}

export async function 글쓰기시도API(page: Page, 본문: Record<string, unknown>): Promise<시도결과> {
  const 응답 = await page.request.post('/api/v1/statuses', {
    headers: { Authorization: `Bearer ${await 토큰(page)}`, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    data: 본문,
  });
  const 몸글 = (await 응답.json()) as { id?: string; error?: string };
  return { 상태: 응답.status(), 오류: 몸글.error ?? '', 글번호: 응답.ok() ? 몸글.id : undefined };
}

export async function 인용글찾기API(page: Page, 아이디: string): Promise<{ 인용글: 글; 원글: 글; 원글조각: string }> {
  const 그계정 = (await (await page.request.get(`/api/v1/accounts/lookup?acct=${encodeURIComponent(아이디)}`)).json()) as { id: string };
  const 목록 = (await (await page.request.get(`/api/v1/accounts/${그계정.id}/statuses?limit=40`)).json()) as (글 & { quote?: { quoted_status?: 글 } | null })[];
  const 찾음 = 목록.find((s) => s.quote?.quoted_status !== undefined && s.quote.quoted_status !== null);
  const 원글 = 찾음?.quote?.quoted_status;
  if (찾음 === undefined || 원글 === undefined) throw new Error(`${아이디} 의 글에서 인용한 글을 못 찾았다`);
  return { 인용글: 찾음, 원글, 원글조각: 원글.content.replace(/<[^>]+>/g, '').trim().slice(0, 12) };
}

export async function 내글개수API(page: Page, 글조각: string): Promise<number> {
  const 나 = await 내계정API(page);
  const 목록 = await 몸<글[]>(await apiGet(page, `/api/v1/accounts/${나.id}/statuses?limit=40`));
  return 목록.filter((s) => s.content.includes(글조각)).length;
}

export async function 내글모두지우기API(page: Page, 글조각: string): Promise<void> {
  const 나 = await 내계정API(page);
  const 목록 = await 몸<글[]>(await apiGet(page, `/api/v1/accounts/${나.id}/statuses?limit=40`));
  for (const s of 목록.filter((x) => x.content.includes(글조각))) await 글지우기API(page, s.id);
}

