import { request as 요청만들기, type APIRequestContext, type BrowserContext, type Locator, type Page, type Response as 응답, type Route } from '@playwright/test';

import type { 머리글 } from '../components/header.component.js';
import { API로그인, 둘째아이디 } from './account.helper.js';
import { 테스트글머리 } from './post.helper.js';

export const 남의시드글 = 47;
export const 없는글번호 = 99999;

const 작은PNG바탕 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG머리 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface 이미지파일 {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export interface 목록글 {
  id: number;
  category: string;
  title: string;
  author: string;
  authorId: number;
  views: number;
  likes: number;
  commentCount: number;
}

export interface 글목록응답 {
  notices: 목록글[];
  items: 목록글[];
  total: number;
  page: number;
  size: number;
}

export interface 댓글응답 {
  id: number;
  parentId: number | null;
  authorId: number;
  author: string;
  content: string;
  edited: boolean;
  deleted: boolean;
}

export function 글머리(tcId: string): string {
  return `${테스트글머리}${tcId} `;
}

export function 고유제목(tcId: string, 말: string): string {
  return `${글머리(tcId)}${말} ${Date.now().toString(36)}`;
}

export function 작은이미지(이름: string): 이미지파일 {
  return { name: 이름, mimeType: 'image/png', buffer: Buffer.from(작은PNG바탕, 'base64') };
}

export function 큰이미지(이름: string, 바이트: number): 이미지파일 {
  return { name: 이름, mimeType: 'image/png', buffer: Buffer.concat([PNG머리, Buffer.alloc(바이트 - PNG머리.length)]) };
}

export function gif이미지(이름: string): 이미지파일 {
  return { name: 이름, mimeType: 'image/gif', buffer: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') };
}

export async function 둘째회원문맥(비밀번호: string): Promise<APIRequestContext> {
  const 문맥 = await 요청만들기.newContext({ baseURL: process.env.PLATFORM_BASE_URL });
  const 상태 = await API로그인(문맥, 둘째아이디, 비밀번호);
  if (상태 !== 200) {
    await 문맥.dispose();
    throw new Error(`둘째 회원 로그인 실패: ${상태}`);
  }
  return 문맥;
}

export async function 익명문맥(): Promise<APIRequestContext> {
  return 요청만들기.newContext({ baseURL: process.env.PLATFORM_BASE_URL });
}

export async function 이미지글만들기(req: APIRequestContext, 글: { title: string; content?: string; images: string[] }): Promise<number> {
  const 응답값 = await req.post('/api/posts', {
    data: { category: '자유', title: 글.title, content: 글.content ?? '자동 시험이 만든 글입니다. 곧 지워집니다.', images: 글.images },
  });
  if (!응답값.ok()) throw new Error(`이미지 글 만들기 실패: ${응답값.status()} ${await 응답값.text()}`);
  return ((await 응답값.json()) as { id: number }).id;
}

export function 이미지주소(파일: 이미지파일): string {
  return `data:${파일.mimeType};base64,${파일.buffer.toString('base64')}`;
}

export async function 글목록읽기(req: APIRequestContext, 조건: Record<string, string | number>): Promise<글목록응답> {
  const 값 = await req.get('/api/posts', { params: 조건 });
  if (!값.ok()) throw new Error(`글 목록 읽기 실패: ${값.status()}`);
  return (await 값.json()) as 글목록응답;
}

export async function 제목으로찾은글수(req: APIRequestContext, 제목: string): Promise<number> {
  const 목록 = await 글목록읽기(req, { field: 'title', q: 제목, size: 50 });
  return 목록.items.filter((글) => 글.title === 제목).length;
}

export async function 댓글목록읽기(req: APIRequestContext, 글번호: number): Promise<댓글응답[]> {
  const 값 = await req.get(`/api/posts/${글번호}/comments`);
  if (!값.ok()) throw new Error(`댓글 목록 읽기 실패: ${값.status()}`);
  return ((await 값.json()) as { items: 댓글응답[] }).items;
}

export async function 등록뒤글번호(page: Page, 값: 응답): Promise<number | null> {
  if (!값.ok()) return null;
  await page.waitForURL(/\/board\/\d+$/);
  return Number(new URL(page.url()).pathname.split('/').pop());
}

export async function 잠시기다림(칸: Locator, 제한 = 3000): Promise<void> {
  await 칸.waitFor({ timeout: 제한 }).catch(() => undefined);
}

export async function 로그인화면표시기다리기(page: Page): Promise<void> {
  await page.getByLabel('아이디').waitFor();
}

export async function 홈열고알림수읽기(page: Page, 머리: 머리글): Promise<number> {
  const 응답기다림 = page.waitForResponse((값) => 값.url().includes('/api/notifications') && 값.request().method() === 'GET');
  await page.goto('/');
  await 응답기다림;
  await 머리.알림종.waitFor();
  await page.waitForLoadState('networkidle');
  if (!(await 머리.알림수.isVisible())) return 0;
  return Number((await 머리.알림수.innerText()).replace(/\D/g, ''));
}

export async function 토스트자리읽기(page: Page, 칸: Locator): Promise<{ 가운데: boolean; 아래: boolean }> {
  const 상자 = await 칸.boundingBox();
  const 화면 = page.viewportSize();
  if (상자 === null || 화면 === null) throw new Error('토스트 자리를 읽지 못했다');
  const 중심 = 상자.x + 상자.width / 2;
  const 아래여백 = 화면.height - (상자.y + 상자.height);
  return { 가운데: Math.abs(중심 - 화면.width / 2) <= 2, 아래: 상자.y > 화면.height / 2 && 아래여백 <= 화면.height / 4 };
}

export async function 토스트시작높이(칸: Locator): Promise<number> {
  return 칸.evaluate((요소) => {
    const 이름 = getComputedStyle(요소).animationName;
    for (const 시트 of Array.from(document.styleSheets)) {
      for (const 규칙 of Array.from(시트.cssRules)) {
        if (규칙 instanceof CSSKeyframesRule && 규칙.name === 이름) {
          const 처음 = 규칙.cssRules[0] as CSSKeyframeRule;
          const 값 = /translateY\((-?[\d.]+)px\)/.exec(처음.style.transform);
          return 값 === null ? 0 : Number(값[1]);
        }
      }
    }
    return 0;
  });
}

export async function 관리자세션걸기(context: BrowserContext): Promise<() => Promise<void>> {
  const 처리 = async (route: Route) => {
    const 원래 = await route.fetch();
    const 본문 = (await 원래.json()) as { user: Record<string, unknown> | null };
    await route.fulfill({ response: 원래, json: { user: 본문.user === null ? null : { ...본문.user, role: 'admin' } } });
  };
  await context.route('**/api/session', 처리);
  return () => context.unroute('**/api/session', 처리);
}

export async function 글목록500걸기(context: BrowserContext): Promise<() => Promise<void>> {
  const 패턴 = /\/api\/posts\?/;
  const 처리 = async (route: Route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' }) });
  };
  await context.route(패턴, 처리);
  return () => context.unroute(패턴, 처리);
}

export interface 창기록 {
  종류: string;
  메시지: string;
}

export function 창기록하며받기(page: Page): 창기록[] {
  const 기록: 창기록[] = [];
  page.on('dialog', (창) => {
    기록.push({ 종류: 창.type(), 메시지: 창.message() });
    void 창.accept();
  });
  return 기록;
}

export async function 클립보드준비(context: BrowserContext): Promise<void> {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.addInitScript(() => {
    if (navigator.clipboard) return;
    let 담은글 = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (글: string) => {
          담은글 = 글;
        },
        readText: async () => 담은글,
      },
    });
  });
}
