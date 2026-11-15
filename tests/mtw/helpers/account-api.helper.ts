import type { APIResponse, Page } from '@playwright/test';

import { apiDelete, apiGet, apiPost, type 글, 계정찾기API, 내계정API, 몸, 토큰 } from './api.helper.js';
import { 로그인하기 } from './login.helper.js';
import { type 새창, 새창열기 } from './page-setup.helper.js';

export interface 관계 {
  id: string;
  following: boolean;
  followed_by: boolean;
  requested: boolean;
  muting: boolean;
  blocking: boolean;
  note: string;
}

export async function 계정창열기(page: Page, 아이디: string | undefined, 암호: string | undefined): Promise<새창> {
  const 창 = await 새창열기(page);
  try {
    await 로그인하기(창.page, 아이디, 암호);
  } catch (오류) {
    await 창.창묶음.close();
    throw new Error(`다른 계정 창에서 로그인하지 못했다 — ${String(오류)}`);
  }
  return 창;
}

export async function 관계API(page: Page, 대상id: string): Promise<관계> {
  const 목록 = await 몸<관계[]>(await apiGet(page, `/api/v1/accounts/relationships?id[]=${대상id}`));
  const 첫째 = 목록[0];
  if (첫째 === undefined) throw new Error(`관계 응답이 비었다 — ${대상id}`);
  return 첫째;
}

export async function 관계바꾸기API(page: Page, 대상id: string, 동작: 'follow' | 'unfollow' | 'mute' | 'unmute' | 'block' | 'unblock' | 'remove_from_followers'): Promise<관계> {
  return 몸<관계>(await apiPost(page, `/api/v1/accounts/${대상id}/${동작}`));
}

export async function 메모바꾸기API(page: Page, 대상id: string, 글: string): Promise<void> {
  await 몸<관계>(await apiPost(page, `/api/v1/accounts/${대상id}/note`, { comment: 글 }));
}

export function 긴글(글자수: number): string {
  return '가나다라마바사아자차'.repeat(Math.ceil(글자수 / 10)).slice(0, 글자수);
}

const 표 = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(자료: Buffer): number {
  let c = 0xffffffff;
  for (const b of 자료) c = (표[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function 압축없이(자료: Buffer): Buffer {
  const 조각들: Buffer[] = [Buffer.from([0x78, 0x01])];
  for (let i = 0; i < 자료.length; i += 65535) {
    const 조각 = 자료.subarray(i, i + 65535);
    const 머리 = Buffer.alloc(5);
    머리[0] = i + 65535 >= 자료.length ? 1 : 0;
    머리.writeUInt16LE(조각.length, 1);
    머리.writeUInt16LE(~조각.length & 0xffff, 3);
    조각들.push(머리, 조각);
  }
  let a = 1;
  let b = 0;
  for (const x of 자료) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  const 끝 = Buffer.alloc(4);
  끝.writeUInt32BE(((b << 16) | a) >>> 0);
  조각들.push(끝);
  return Buffer.concat(조각들);
}

function 덩어리(종류: string, 자료: Buffer): Buffer {
  const 길이 = Buffer.alloc(4);
  길이.writeUInt32BE(자료.length);
  const 본체 = Buffer.concat([Buffer.from(종류), 자료]);
  const 검사값 = Buffer.alloc(4);
  검사값.writeUInt32BE(crc32(본체));
  return Buffer.concat([길이, 본체, 검사값]);
}

export function 크기맞춘PNG(바이트: number): { name: string; mimeType: string; buffer: Buffer } {
  const 가로 = 600;
  const 세로 = 600;
  const 원본 = Buffer.alloc((가로 * 3 + 1) * 세로);
  for (let y = 0; y < 세로; y += 1) {
    for (let x = 0; x < 가로 * 3; x += 1) 원본[y * (가로 * 3 + 1) + 1 + x] = (x * 7 + y * 13) % 256;
  }
  const 머리 = Buffer.alloc(13);
  머리.writeUInt32BE(가로, 0);
  머리.writeUInt32BE(세로, 4);
  머리[8] = 8;
  머리[9] = 2;
  const 서명 = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const 끝 = 덩어리('IEND', Buffer.alloc(0));
  const 앞 = Buffer.concat([서명, 덩어리('IHDR', 머리), 덩어리('IDAT', 압축없이(원본))]);
  const 채울길이 = 바이트 - 앞.length - 끝.length - 12;
  if (채울길이 < 0) throw new Error(`PNG 가 목표 크기보다 크다 — ${String(앞.length)}`);
  return { name: `크기${String(바이트)}.png`, mimeType: 'image/png', buffer: Buffer.concat([앞, 덩어리('prVt', Buffer.alloc(채울길이)), 끝]) };
}

export async function 리스트채우기API(page: Page, 제목들: string[]): Promise<string[]> {
  const 만든것 = await Promise.all(제목들.map(async (title) => 몸<{ id: string }>(await apiPost(page, '/api/v1/lists', { title }))));
  return 만든것.map((리스트) => 리스트.id);
}

export async function 리스트지우기API(page: Page, 번호들: string[]): Promise<void> {
  await Promise.all(번호들.map((번호) => apiDelete(page, `/api/v1/lists/${번호}`)));
}

export async function apiPatch(page: Page, 경로: string, 본문: unknown): Promise<APIResponse> {
  return page.request.patch(경로, { headers: { Authorization: `Bearer ${await 토큰(page)}` }, data: 본문 });
}

export async function 팔로워전용글조각(page: Page, 아이디: string): Promise<string> {
  const 계정 = await 계정찾기API(page, 아이디);
  const 글들 = await 몸<글[]>(await apiGet(page, `/api/v1/accounts/${계정.id}/statuses?limit=40`));
  const 대상 = 글들.find((s) => s.visibility === 'private');
  if (대상 === undefined) throw new Error(`${아이디} 의 팔로워 전용 글을 못 찾았다`);
  return 대상.content.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').trim().slice(0, 12);
}

export async function 내소개API(page: Page): Promise<{ display_name: string; note: string; fields: { name: string; value: string }[] }> {
  const 몸값 = await 몸<{ display_name: string; source: { note: string; fields: { name: string; value: string }[] } }>(await apiGet(page, '/api/v1/accounts/verify_credentials'));
  return { display_name: 몸값.display_name, note: 몸값.source.note, fields: 몸값.source.fields };
}

export async function 프로필되돌리기API(page: Page, 원래: { display_name?: string; note?: string; fields: { name: string; value: string }[] }): Promise<void> {
  const 필드 = Object.fromEntries([0, 1, 2, 3].map((순서) => [순서, { name: 원래.fields[순서]?.name ?? '', value: 원래.fields[순서]?.value ?? '' }]));
  await 몸(await apiPatch(page, '/api/v1/accounts/update_credentials', { display_name: 원래.display_name ?? '', note: 원래.note ?? '', fields_attributes: 필드 }));
}

export async function 컬렉션번호API(page: Page, 이름: string): Promise<string> {
  const 나 = await 내계정API(page);
  const 목록 = await 몸<{ collections: { id: string; name: string }[] }>(await apiGet(page, `/api/v1/accounts/${나.id}/collections`));
  const 찾음 = 목록.collections.find((컬렉션) => 컬렉션.name === 이름);
  if (찾음 === undefined) throw new Error(`컬렉션 「${이름}」을 못 찾았다`);
  return 찾음.id;
}

export async function 공개표시이름(page: Page, 아이디: string): Promise<string> {
  const 응답 = await page.request.get(`/api/v1/accounts/lookup?acct=${encodeURIComponent(아이디)}`);
  if (!응답.ok()) throw new Error(`계정 조회 실패 ${String(응답.status())} — ${아이디}`);
  return ((await 응답.json()) as { display_name: string }).display_name;
}

function 정규식글자(글: string): string {
  return 글.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function 이름이든글식(이름: string, 뒷글: string): RegExp {
  const 변형글자 = String.fromCodePoint(0xfe0f);
  const 이름조각 = [...이름.split(변형글자).join('')].map((글자) => `${정규식글자(글자)}\\uFE0F?`);
  return new RegExp(`${이름조각.join('')} ${정규식글자(뒷글)}`);
}

export async function 내컬렉션번호들API(page: Page): Promise<string[]> {
  const 나 = await 내계정API(page);
  const 목록 = await 몸<{ collections: { id: string }[] }>(await apiGet(page, `/api/v1/accounts/${나.id}/collections`));
  return 목록.collections.map((컬렉션) => 컬렉션.id);
}

export async function 계정채운컬렉션만들기API(page: Page, 이름: string, 개수: number): Promise<{ 번호: string; 넣은수: number }> {
  const 나 = await 내계정API(page);
  const 만든것 = await 몸<{ collection?: { id: string }; id?: string }>(await apiPost(page, '/api/v1/collections', { name: 이름, description: '계정 한도 확인', sensitive: false, discoverable: false }));
  const 번호 = 만든것.collection?.id ?? 만든것.id ?? '';
  if (번호 === '') throw new Error('컬렉션을 만들지 못했다');
  const 후보 = await 몸<{ id: string; username: string }[]>(await apiGet(page, '/api/v1/directory?local=true&limit=80'));
  for (let 번째 = 1; 번째 <= 20; 번째 += 1) 후보.push(await 계정찾기API(page, `qa_feat_${String(번째).padStart(2, '0')}`));
  let 넣은수 = 0;
  for (const 계정 of 후보) {
    if (넣은수 >= 개수) break;
    if (계정.id === 나.id || /^(qa_user|tc_)/.test(계정.username)) continue;
    if ((await apiPost(page, `/api/v1/collections/${번호}/items`, { account_id: 계정.id })).ok()) 넣은수 += 1;
  }
  return { 번호, 넣은수 };
}

export async function 새로생긴컬렉션지우기API(page: Page, 앞번호들: string[]): Promise<string[]> {
  const 새것 = (await 내컬렉션번호들API(page)).filter((번호) => !앞번호들.includes(번호));
  for (const 번호 of 새것) await apiDelete(page, `/api/v1/collections/${번호}`);
  return 새것;
}
