import type { Cookie, Locator, Page } from '@playwright/test';

import { opsPut, 점검읽기, 지급목록, 지급치우기 } from './ops-api.helper.js';
import type { 응답, 점검, 지급건 } from './ops-api.helper.js';

const 하루 = 24 * 60 * 60 * 1000;
const 두자리 = (n: number): string => String(n).padStart(2, '0');

export const 꺼진점검: 점검 = { enabled: false, message: '', startsAt: null, endsAt: null, allowedAccountIds: '' };

export function 일시입력값(시각: Date): string {
  return `${String(시각.getFullYear())}-${두자리(시각.getMonth() + 1)}-${두자리(시각.getDate())}T${두자리(시각.getHours())}:${두자리(시각.getMinutes())}`;
}

export const 내일입력값 = (분 = 0): string => 일시입력값(new Date(Date.now() + 하루 + 분 * 60_000));
export const 내일ISO = (): string => new Date(Date.now() + 하루).toISOString();

export function 점검바꾸기(page: Page, 내용: 점검): Promise<응답> {
  const 번호들 = 내용.allowedAccountIds
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map(Number);
  return opsPut(page, '/maintenance', { enabled: 내용.enabled, message: 내용.message, startsAt: 내용.startsAt, endsAt: 내용.endsAt, allowedAccountIds: 번호들 });
}

export async function 점검끄고앞상태받기(page: Page): Promise<점검> {
  const 앞 = await 점검읽기(page);
  const 지난실행것 = 앞.message.startsWith('[QA]');
  if (앞.enabled) {
    const r = await 점검바꾸기(page, { ...(지난실행것 ? 꺼진점검 : 앞), enabled: false });
    if (r.status >= 300) throw new Error(`점검을 끄지 못했다: ${String(r.status)} ${JSON.stringify(r.body)}`);
  }
  return 지난실행것 ? 꺼진점검 : 앞;
}

export async function 점검원래대로(page: Page, 앞: 점검): Promise<void> {
  const r = await 점검바꾸기(page, 앞);
  if (r.status < 300) return;
  const 끄기 = await 점검바꾸기(page, 꺼진점검);
  if (끄기.status >= 300) throw new Error(`점검을 되돌리지 못했다: ${String(끄기.status)} ${JSON.stringify(끄기.body)}`);
}

export async function 로그인상태인가(page: Page): Promise<boolean> {
  const r = await page.request.get('/api/session');
  if (!r.ok()) return false;
  const 몸 = (await r.json().catch(() => ({}))) as { operator?: unknown };
  return 몸.operator !== null && 몸.operator !== undefined;
}

export async function 쿠키읽기(page: Page, 이름: string): Promise<Cookie | undefined> {
  return (await page.context().cookies()).find((c) => c.name === 이름 && c.value !== '');
}

export async function 쿠키심기(page: Page, 쿠키: Cookie | undefined): Promise<void> {
  if (쿠키 === undefined) throw new Error('심을 쿠키가 없다 — 로그인 쿠키를 먼저 읽는다');
  await page.context().addCookies([쿠키]);
}

export async function 쿠키값심기(page: Page, 이름: string, 값: string): Promise<void> {
  await page.context().addCookies([{ name: 이름, value: 값, url: new URL(page.url()).origin, httpOnly: true, secure: true, sameSite: 'Strict' }]);
}

export async function 시각지날때까지(page: Page, 목표: number): Promise<void> {
  await page.waitForFunction((t) => Date.now() >= t, 목표, { timeout: 30_000 });
}

async function 모든지급(page: Page): Promise<지급건[]> {
  const 모음: 지급건[] = [];
  for (let 쪽 = 1; 쪽 <= 30; 쪽 += 1) {
    const 목록 = await 지급목록(page, 쪽, 100);
    모음.push(...목록.items);
    if (쪽 * 100 >= 목록.total) break;
  }
  return 모음;
}

export async function 지난지급치우기(page: Page, 머리글: string): Promise<void> {
  for (const g of await 모든지급(page)) if (g.subject.startsWith(머리글) && g.recalledAt === null) await 지급치우기(page, g.id);
}

export async function 오늘지급수(page: Page): Promise<number> {
  const 자정 = new Date();
  자정.setUTCHours(0, 0, 0, 0);
  return (await 모든지급(page)).filter((g) => new Date(g.createdAt).getTime() >= 자정.getTime()).length;
}

export async function 안받은우편수(page: Page): Promise<number> {
  return (await 모든지급(page)).reduce((합, g) => 합 + g.mails.filter((m) => m.status === 'SENT').length, 0);
}

export async function 카드눌러도착보기(page: Page, 카드: Locator, 도착제목: Locator, 주소: string): Promise<boolean> {
  await 카드.click();
  const 보임 = await 도착제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  return 보임 && new URL(page.url()).pathname === 주소;
}

export function 숫자글(수: number): string {
  return 수.toLocaleString('ko-KR');
}

export function 비밀키있나(본문: unknown): boolean {
  return /"[^"]*(passw|hash|salt|pwd)[^"]*"\s*:/i.test(JSON.stringify(본문));
}
