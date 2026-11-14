import type { Locator, Page, Request } from '@playwright/test';

import { opsGet, opsPut, 공지목록, 공지지우기, type 공지, type 응답, type 점검 } from './ops-api.helper.js';

const 두자리 = (수: number): string => String(수).padStart(2, '0');

export const 하루 = 86_400_000;
export const 한시간 = 3_600_000;

export function 화면시각(값: string | number | Date): string {
  const d = new Date(값);
  return `${String(d.getFullYear())}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())} ${두자리(d.getHours())}:${두자리(d.getMinutes())}`;
}

export function 입력칸시각(값: number | Date): string {
  const d = new Date(값);
  return `${String(d.getFullYear())}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())}T${두자리(d.getHours())}:${두자리(d.getMinutes())}`;
}

export const 지금에서 = (밀리초: number): string => new Date(Date.now() + 밀리초).toISOString();

export const 공지머리글 = (tcId: string): string => `[QA] ${tcId} `;

export const 고유글 = (tcId: string): string => `[QA] ${tcId} ${String(Date.now())}`;

export async function 제목으로공지찾기(page: Page, 제목: string): Promise<공지 | undefined> {
  return (await 공지목록(page)).find((n) => n.title === 제목);
}

export async function 제목으로공지치우기(page: Page, 제목: string): Promise<void> {
  for (const n of await 공지목록(page)) if (n.title === 제목) await 공지지우기(page, n.id);
}

export async function 내용으로공지치우기(page: Page, 머리글: string): Promise<void> {
  for (const n of await 공지목록(page)) if (n.body.startsWith(머리글)) await 공지지우기(page, n.id);
}

export async function 번호들로공지치우기(page: Page, 번호들: number[]): Promise<void> {
  const 있는것 = new Set((await 공지목록(page)).map((n) => n.id));
  for (const 번호 of 번호들) if (있는것.has(번호)) await 공지지우기(page, 번호);
}

export async function 점검저장하기(page: Page, 내용: 점검): Promise<응답> {
  const 번호들 = 내용.allowedAccountIds
    .split(',')
    .map((글) => 글.trim())
    .filter((글) => 글 !== '')
    .map(Number);
  return opsPut(page, '/maintenance', { enabled: 내용.enabled, message: 내용.message, startsAt: 내용.startsAt, endsAt: 내용.endsAt, allowedAccountIds: 번호들 });
}

export async function 점검돌려놓기(page: Page, 앞: 점검): Promise<void> {
  const r = await 점검저장하기(page, 앞);
  if (r.status >= 300) throw new Error(`점검을 원래대로 되돌리지 못했다: ${String(r.status)} ${JSON.stringify(r.body)}`);
}

export interface 작업기록 {
  id: number;
  operator: string;
  area: string;
  action: string;
  target: string;
  detail: string;
  at: string;
}

export const 영역이름: Record<string, string> = { AUTH: '로그인', SANCTION: '제재', GRANT: '지급 · 회수', NOTICE: '공지', MAINTENANCE: '점검' };

export function 작업기록줄글(a: 작업기록): string {
  return [화면시각(a.at), a.operator, 영역이름[a.area] ?? a.area, a.action, a.target, a.detail].join(' | ');
}

export async function 작업기록읽기(page: Page, 쪽: number, 크기: number): Promise<{ items: 작업기록[]; total: number }> {
  const r = await opsGet(page, `/logs/audit?area=&q=&page=${String(쪽)}&size=${String(크기)}`);
  if (r.status >= 300) throw new Error(`운영자 작업 기록을 읽지 못했다: ${String(r.status)}`);
  return r.body as unknown as { items: 작업기록[]; total: number };
}

export async function 쉰한번째기록줄글(page: Page): Promise<string> {
  const 몸 = await 작업기록읽기(page, 1, 51);
  const 줄 = 몸.items[50];
  if (!줄) throw new Error(`운영자 작업 기록이 51건 미만이다: ${String(몸.total)}건`);
  return 작업기록줄글(줄);
}

export async function 작업기록채우기(page: Page, 아이디: string, 비밀번호: string, 목표: number): Promise<void> {
  for (let 번 = 0; 번 < 목표; 번 += 1) {
    if ((await 작업기록읽기(page, 1, 1)).total >= 목표) return;
    const r = await page.request.post('/api/login', { data: { userName: 아이디, password: 비밀번호 } });
    if (!r.ok()) throw new Error(`기록을 채우려는 로그인이 ${String(r.status())} 로 실패했다`);
  }
}

export interface 아이템흐름 {
  id: number;
  playerCharacterId: number;
  characterName: string;
  kind: string;
  itemName: string;
  quantity: number;
  currencyAmount: number;
  grantId: number | null;
  actor: string;
}

export async function 흐름읽기(page: Page, 검색어: string): Promise<{ items: 아이템흐름[]; total: number }> {
  const r = await opsGet(page, `/logs/items?kind=&q=${encodeURIComponent(검색어)}&page=1&size=50`);
  if (r.status >= 300) throw new Error(`아이템 흐름을 읽지 못했다: ${String(r.status)}`);
  return r.body as unknown as { items: 아이템흐름[]; total: number };
}

export function 정수글(수: number): string {
  return 수.toLocaleString('ko-KR');
}

export async function 아래에있나(위: Locator, 아래들: Locator[]): Promise<boolean> {
  const 윗상자 = await 위.boundingBox();
  if (윗상자 === null) return false;
  for (const 아래 of 아래들) {
    const 상자 = await 아래.boundingBox();
    if (상자 === null || 상자.y < 윗상자.y + 윗상자.height - 1) return false;
  }
  return true;
}

export function 요청세기(page: Page, 맞는가: (요청: Request) => boolean): { 끝날때까지: () => Promise<number> } {
  let 나감 = 0;
  let 끝남 = 0;
  page.on('request', (요청) => {
    if (맞는가(요청)) 나감 += 1;
  });
  page.on('requestfinished', (요청) => {
    if (맞는가(요청)) 끝남 += 1;
  });
  page.on('requestfailed', (요청) => {
    if (맞는가(요청)) 끝남 += 1;
  });
  return {
    async 끝날때까지() {
      for (let 번 = 0; 번 < 100; 번 += 1) {
        await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
        if (나감 > 0 && 끝남 >= 나감) return 나감;
      }
      return 나감;
    },
  };
}
