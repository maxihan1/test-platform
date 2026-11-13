import type { Page, Route } from '@playwright/test';

import { opsGet, 지급목록, 지급보내기, 지급치우기, 새지급 } from './ops-api.helper.js';
import type { 응답, 지급건, 지급내용 } from './ops-api.helper.js';

export async function 로그인돼있는가(page: Page): Promise<boolean> {
  return (await opsGet(page, '/summary')).status === 200;
}

export const 없는번호들 = (개수: number): number[] => Array.from({ length: 개수 }, (_, i) => 900000000 + i);

export const 고유접두 = (tcId: string): string => `[QA] ${tcId}`;

export const 고유글 = (tcId: string): string => `${고유접두(tcId)} ${String(Date.now())}`;

export function 지급내용만들기(캐릭터: number, 제목: string, 사유: string, 덧붙임: Partial<지급내용> = {}): 지급내용 {
  return {
    characterIds: [캐릭터],
    subject: 제목,
    body: '',
    items: [{ itemName: '체력 물약', quantity: 1 }],
    currencyAmount: 0,
    reason: 사유,
    ...덧붙임,
  };
}

export const 번호들로지급보내기 = (page: Page, 번호들: number[], 제목: string, 덧붙임: Partial<지급내용> = {}): Promise<응답> =>
  지급보내기(page, { ...지급내용만들기(0, 제목, 제목), characterIds: 번호들, ...덧붙임 });

export async function 제목으로지급찾기(page: Page, 제목: string): Promise<지급건> {
  const 목록 = await 지급목록(page, 1, 100);
  const 건 = 목록.items.find((g) => g.subject === 제목);
  if (!건) throw new Error(`제목 「${제목}」 지급을 이력에서 찾지 못했다`);
  return 건;
}

export async function 글자로지급찾기(page: Page, 글: string): Promise<지급건[]> {
  const 목록 = await 지급목록(page, 1, 100);
  return 목록.items.filter((g) => g.subject.startsWith(글) || g.reason.startsWith(글));
}

export async function 내것지급치우기(page: Page, 접두: string): Promise<void> {
  for (const 건 of await 글자로지급찾기(page, 접두)) if (!건.recalledAt) await 지급치우기(page, 건.id);
}

export async function 이력채우기(page: Page, 최소: number, 캐릭터: number, 접두: string): Promise<number[]> {
  const 보낸: number[] = [];
  const 지금 = (await 지급목록(page, 1, 1)).total;
  for (let i = 0; i < 최소 - 지금; i += 1) 보낸.push(await 새지급(page, 지급내용만들기(캐릭터, `${접두} 채움 ${String(i + 1)} ${String(Date.now())}`, `${접두} 채움`)));
  return 보낸;
}

export async function 모두받은지급찾기(page: Page): Promise<number | null> {
  for (let 쪽 = 1; ; 쪽 += 1) {
    const 목록 = await 지급목록(page, 쪽, 100);
    const 건 = 목록.items.find((g) => !g.recalledAt && g.mails.length > 0 && g.mails.every((m) => m.status === 'TAKEN'));
    if (건) return 건.id;
    if (목록.items.length === 0 || 쪽 * 100 >= 목록.total) return null;
  }
}

const 가짜캐릭터 = (순번: number): Record<string, unknown> => ({
  id: 900000 + 순번,
  accountId: 900000 + 순번,
  name: `zz가짜${String(순번).padStart(2, '0')}`,
  level: 1,
  characterClass: '',
  race: 'Human',
  scene: '',
  savedOn: '2026-11-01T00:00:00Z',
  currencies: [],
  items: {},
});

export async function 캐릭터51명모킹걸기(page: Page): Promise<() => Promise<void>> {
  const 패턴 = '**/api/ops/characters**';
  const 응답 = async (route: Route): Promise<void> => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Array.from({ length: 51 }, (_, i) => 가짜캐릭터(i + 1))) });
  };
  await page.context().route(패턴, 응답);
  return () => page.context().unroute(패턴, 응답);
}

export async function 빈지급이력모킹걸기(page: Page): Promise<() => Promise<void>> {
  const 패턴 = '**/api/ops/grants**';
  const 응답 = async (route: Route): Promise<void> => {
    const 요청 = route.request();
    if (요청.method() !== 'GET' || new URL(요청.url()).pathname !== '/api/ops/grants') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) });
  };
  await page.context().route(패턴, 응답);
  return () => page.context().unroute(패턴, 응답);
}
