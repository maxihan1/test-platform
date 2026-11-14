import type { Page } from '@playwright/test';

import { 운영자쿠키받기 } from './login.helper.js';
import { 계정목록, 계정번호, 계정상세읽기, opsGet, 적용중제재풀기 } from './ops-api.helper.js';
import type { 제재, 제재종류 } from './ops-api.helper.js';

export const 시험계정 = 'qa_player2';

export async function 대상준비(page: Page, 아이디: string | undefined, 비밀번호: string | undefined): Promise<number> {
  await 운영자쿠키받기(page, 아이디, 비밀번호);
  const 계정 = await 계정번호(page, 시험계정);
  await 적용중제재풀기(page, 계정);
  return 계정;
}

export function 시험사유(tcId: string): string {
  return `[QA] ${tcId} ${String(Date.now())}`;
}

export function 채운사유(앞: string, 길이: number): string {
  return 앞.length >= 길이 ? 앞.slice(0, 길이) : `${앞}${'가'.repeat(길이 - 앞.length)}`;
}

export async function 적용중찾기(page: Page, 계정: number, 종류: 제재종류): Promise<제재 | null> {
  const 상세 = await 계정상세읽기(page, 계정);
  return 상세.sanctions.find((x) => x.type === 종류 && !x.releasedAt && (!x.endsAt || new Date(x.endsAt).getTime() > Date.now())) ?? null;
}

export async function 끝날때까지기다리기(page: Page, 계정: number, 종류: 제재종류, 끝: string): Promise<void> {
  const 끝시각 = new Date(끝).getTime();
  await page.waitForFunction((t) => Date.now() > t, 끝시각, { timeout: 15_000 });
  const 한도 = Date.now() + 10_000;
  for (;;) {
    const 상세 = await 계정상세읽기(page, 계정);
    if (!(종류 === 'SUSPEND' ? 상세.suspended : 상세.chatMuted)) return;
    if (Date.now() > 한도) throw new Error('끝 시각이 지났는데도 서버가 제재를 풀린 것으로 보지 않는다');
  }
}

export async function 제재없는계정찾기(page: Page, 뺄아이디: string[]): Promise<string | null> {
  const 목록 = await 계정목록(page);
  return 목록.items.find((u) => !u.suspended && !u.chatMuted && !뺄아이디.includes(u.userName))?.userName ?? null;
}

export async function 이력없는계정찾기(page: Page, 뺄아이디: string[]): Promise<string | null> {
  const 목록 = await 계정목록(page);
  for (const u of 목록.items.filter((x) => !뺄아이디.includes(x.userName))) {
    const 상세 = await 계정상세읽기(page, u.id);
    if (상세.sanctions.length === 0) return u.userName;
  }
  return null;
}

export interface 아이템많은캐릭터 {
  계정: number;
  계정이름: string;
  캐릭터이름: string;
  아이템: [string, number][];
}

export async function 아이템많은캐릭터찾기(page: Page, 종수: number): Promise<아이템많은캐릭터 | null> {
  const 목록 = await 계정목록(page);
  for (const u of 목록.items) {
    const 상세 = await 계정상세읽기(page, u.id);
    for (const c of 상세.characters) {
      const 아이템 = Object.entries(c.items ?? {});
      if (아이템.length > 종수) return { 계정: u.id, 계정이름: u.userName, 캐릭터이름: c.name, 아이템 };
    }
  }
  return null;
}

export async function 없는계정번호(page: Page): Promise<number> {
  const 목록 = await 계정목록(page);
  return Math.max(...목록.items.map((u) => u.id)) + 100_000;
}

export async function 이메일에만숫자가든계정찾기(page: Page): Promise<{ 아이디: string; 숫자: string } | null> {
  const 목록 = await 계정목록(page);
  for (const u of 목록.items) {
    const 이메일숫자 = u.email.match(/\d+/g) ?? [];
    const 바깥숫자 = 이메일숫자.find((n) => !u.userName.includes(n) && String(u.id) !== n);
    if (바깥숫자 !== undefined) return { 아이디: u.userName, 숫자: 바깥숫자 };
  }
  return null;
}

export async function 캐릭터의계정아이디(page: Page, 캐릭터이름: string): Promise<string> {
  const 응답 = await opsGet(page, `/characters?q=${encodeURIComponent(캐릭터이름)}`);
  if (응답.status >= 300) throw new Error(`캐릭터 찾기가 ${String(응답.status)} 로 실패했다`);
  const 목록 = 응답.body as unknown as { accountId: number; name: string }[];
  const 줄 = 목록.find((c) => c.name === 캐릭터이름);
  if (!줄) throw new Error(`캐릭터 「${캐릭터이름}」를 찾지 못했다`);
  return (await 계정상세읽기(page, 줄.accountId)).userName;
}
