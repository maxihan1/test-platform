import type { APIRequestContext, APIResponse } from '@playwright/test';

import { 관리계정번호, 계정번호, 내번호 } from './account.helper.js';
import { 고유이름, 머리 } from './auth.helper.js';
import { 그림파일, 미디어올리기, 미디어지우기 } from './resource.helper.js';
import { 글지우기, 예약글지우기 } from './status.helper.js';

export interface 설문글 {
  글: string;
  설문: string;
}

export async function 글올리기(
  request: APIRequestContext,
  토큰: string,
  내용: Record<string, unknown> = {},
  덧붙인머리: Record<string, string> = {},
): Promise<APIResponse> {
  return request.post('/api/v1/statuses', {
    headers: { ...머리(토큰), ...덧붙인머리 },
    data: { status: `MTI 시험 글 ${고유이름('')}`, visibility: 'unlisted', ...내용 },
  });
}

export async function 응답번호(응답: APIResponse): Promise<string> {
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as { id?: string }).id ?? '';
}

export async function 글들지우기(request: APIRequestContext, 토큰: string, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) await 글지우기(request, 토큰, 번호);
}

export async function 글과미디어지우기(request: APIRequestContext, 토큰: string, 번호: string): Promise<void> {
  if (번호 === '') return;
  await request.delete(`/api/v1/statuses/${번호}?delete_media=true`, { headers: 머리(토큰) });
}

export async function 미디어들지우기(request: APIRequestContext, 토큰: string, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) await 미디어지우기(request, 토큰, 번호);
}

export async function 미디어여럿올리기(request: APIRequestContext, 토큰: string, 개수: number): Promise<string[]> {
  const 번호들: string[] = [];
  for (let i = 0; i < 개수; i += 1) 번호들.push(await 미디어올리기(request, 토큰));
  return 번호들;
}

export async function 설문글쓰기(
  request: APIRequestContext,
  토큰: string,
  덧붙임: Record<string, unknown> = {},
  항목: string[] = ['사과', '배'],
): Promise<설문글> {
  const 응답 = await 글올리기(request, 토큰, { poll: { options: 항목, expires_in: 3600 }, ...덧붙임 });
  if (응답.status() !== 200) return { 글: '', 설문: '' };
  const 몸 = (await 응답.json()) as { id?: string; poll?: { id?: string } | null };
  return { 글: 몸.id ?? '', 설문: 몸.poll?.id ?? '' };
}

export async function 투표하기(request: APIRequestContext, 토큰: string, 설문: string, 항목: number[]): Promise<number> {
  const 응답 = await request.post(`/api/v1/polls/${설문}/votes`, { headers: 머리(토큰), data: { choices: 항목 } });
  return 응답.status();
}

export async function 잠긴계정비공개글(request: APIRequestContext, 토큰: string): Promise<string> {
  const 계정 = await 계정번호(request, 'yuna_locked');
  if (계정 === '') return '';
  const 응답 = await request.get(`/api/v1/accounts/${계정}/statuses?limit=40`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  const 글들 = (await 응답.json()) as { id: string; visibility?: string }[];
  return 글들.find((글) => 글.visibility === 'private')?.id ?? '';
}

export async function 제한하기(admin: APIRequestContext, 이름: string): Promise<void> {
  const 번호 = await 관리계정번호(admin, 이름);
  if (번호 === '') return;
  await admin.post(`/api/v1/admin/accounts/${번호}/action`, { data: { type: 'silence' } });
}

export async function 제한풀기(admin: APIRequestContext, 이름: string): Promise<void> {
  const 번호 = await 관리계정번호(admin, 이름);
  if (번호 === '') return;
  await admin.post(`/api/v1/admin/accounts/${번호}/unsilence`);
}

export async function 제한됨(admin: APIRequestContext, 이름: string): Promise<boolean> {
  const 번호 = await 관리계정번호(admin, 이름);
  if (번호 === '') return false;
  const 응답 = await admin.get(`/api/v1/admin/accounts/${번호}`);
  if (응답.status() !== 200) return false;
  return ((await 응답.json()) as { silenced?: boolean }).silenced === true;
}

export async function 선호공개범위(request: APIRequestContext, 토큰: string): Promise<string> {
  const 응답 = await request.get('/api/v1/preferences', { headers: 머리(토큰) });
  if (응답.status() !== 200) return '';
  return ((await 응답.json()) as Record<string, string>)['posting:default:visibility'] ?? '';
}

export async function 고정하기(request: APIRequestContext, 토큰: string, 번호: string): Promise<number> {
  const 응답 = await request.post(`/api/v1/statuses/${번호}/pin`, { headers: 머리(토큰) });
  return 응답.status();
}

export async function 고정풀기(request: APIRequestContext, 토큰: string, 번호: string): Promise<void> {
  if (번호 === '') return;
  await request.post(`/api/v1/statuses/${번호}/unpin`, { headers: 머리(토큰) });
}

export async function 고정글수(request: APIRequestContext, 토큰: string): Promise<number> {
  const 계정 = await 내번호(request, 토큰);
  if (계정 === '') return -1;
  const 응답 = await request.get(`/api/v1/accounts/${계정}/statuses?pinned=true`, { headers: 머리(토큰) });
  if (응답.status() !== 200) return -1;
  return ((await 응답.json()) as unknown[]).length;
}

export async function 부스트하기(request: APIRequestContext, 토큰: string, 번호: string): Promise<string> {
  const 응답 = await request.post(`/api/v1/statuses/${번호}/reblog`, { headers: 머리(토큰), data: { visibility: 'unlisted' } });
  return 응답번호(응답);
}

export async function 부스트풀기(request: APIRequestContext, 토큰: string, 번호: string): Promise<void> {
  if (번호 === '') return;
  await request.post(`/api/v1/statuses/${번호}/unreblog`, { headers: 머리(토큰) });
}

export async function 즐겨찾기풀기(request: APIRequestContext, 토큰: string, 번호: string): Promise<void> {
  if (번호 === '') return;
  await request.post(`/api/v1/statuses/${번호}/unfavourite`, { headers: 머리(토큰) });
}

export async function 예약글여럿만들기(request: APIRequestContext, 토큰: string, 개수: number, 며칠뒤: number): Promise<string[]> {
  const 번호들: string[] = [];
  const 첫시각 = new Date();
  첫시각.setUTCDate(첫시각.getUTCDate() + 며칠뒤);
  첫시각.setUTCHours(12, 0, 0, 0);
  for (let i = 0; i < 개수; i += 1) {
    const 시각 = new Date(첫시각.getTime() + i * 60_000).toISOString();
    번호들.push(await 응답번호(await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: 시각 })));
  }
  return 번호들;
}

export function 예약시각(며칠뒤: number, 분: number): string {
  const 시각 = new Date();
  시각.setUTCDate(시각.getUTCDate() + 며칠뒤);
  시각.setUTCHours(12, 분, 0, 0);
  return 시각.toISOString();
}

export async function 예약글들지우기(request: APIRequestContext, 토큰: string, 번호들: string[]): Promise<void> {
  for (const 번호 of 번호들) await 예약글지우기(request, 토큰, 번호);
}

export function 큰그림파일(): { name: string; mimeType: string; buffer: Buffer } {
  const 그림 = 그림파일();
  return { name: 'mti-big.png', mimeType: 'image/png', buffer: Buffer.concat([그림.buffer, Buffer.alloc(16 * 1024 * 1024 + 1024)]) };
}

export function 글자파일(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'mti.txt', mimeType: 'text/plain', buffer: Buffer.from('MTI 시험 글자 파일') };
}

const 동영상머리 = Buffer.from('000000186674797069736f6d0000020069736f6d6d703431', 'hex');

export function 동영상파일(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'mti.mp4', mimeType: 'video/mp4', buffer: Buffer.concat([동영상머리, Buffer.alloc(1024)]) };
}

export function 큰동영상파일(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'mti-big.mp4', mimeType: 'video/mp4', buffer: Buffer.concat([동영상머리, Buffer.alloc(99 * 1024 * 1024 + 1024)]) };
}

export function 큰해상도그림파일(): { name: string; mimeType: string; buffer: Buffer } {
  return { name: 'mti-huge.png', mimeType: 'image/png', buffer: 그림파일().buffer };
}
