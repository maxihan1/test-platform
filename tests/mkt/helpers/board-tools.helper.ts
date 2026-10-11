import type { APIRequestContext, BrowserContext, Locator, Page } from '@playwright/test';

import { API로그인, 새회원정보, 내정보, 탈퇴, 회원가입 } from './account.helper.js';
import type { 회원정보 } from './account.helper.js';
import { 글만들기, 글지우기, 표식 } from './board.helper.js';
import { 파일만들기 } from './files.helper.js';

export interface 글쓴이 {
  정보: 회원정보;
  id: number;
  api: APIRequestContext;
}

export interface 둘째회원 extends 글쓴이 {
  context: BrowserContext;
}

export function 이름있는회원정보(): 회원정보 {
  return { ...새회원정보(), name: `임시${Math.random().toString(36).slice(2, 6)}` };
}

export async function 임시회원으로로그인(api: APIRequestContext): Promise<글쓴이> {
  const 정보 = await 회원가입(api, 이름있는회원정보());
  await API로그인(api, 정보.loginId, 정보.password);
  return { 정보, id: (await 내정보(api)).id, api };
}

export async function 둘째회원열기(page: Page): Promise<둘째회원> {
  const browser = page.context().browser();
  if (browser === null) throw new Error('둘째 회원을 열 브라우저를 찾지 못했다');
  const context = await browser.newContext();
  try {
    const 글쓴이 = await 임시회원으로로그인(context.request);
    return { ...글쓴이, context };
  } catch (err) {
    await context.close();
    throw new Error('둘째 회원을 열지 못했다', { cause: err });
  }
}

export async function 내글모두지우기(회원: 글쓴이): Promise<void> {
  const res = await 회원.api.get(`/api/posts?field=author&q=${encodeURIComponent(회원.정보.name)}&size=50`);
  if (!res.ok()) throw new Error(`내 글 찾기 실패: ${String(res.status())}`);
  const 글들 = ((await res.json()) as { items: { id: number; authorId: number }[] }).items;
  for (const 글 of 글들) {
    if (글.authorId === 회원.id) await 글지우기(회원.api, 글.id);
  }
}

export async function 글쓴이정리하기(회원: 글쓴이): Promise<void> {
  try {
    await 내글모두지우기(회원);
  } finally {
    await 탈퇴(회원.api);
  }
}

export async function 둘째회원정리하기(회원: 둘째회원): Promise<void> {
  try {
    await 글쓴이정리하기(회원);
  } finally {
    await 회원.context.close();
  }
}

export function 글자채우기(앞글: string, 길이: number): string {
  return 앞글.length >= 길이 ? 앞글.slice(0, 길이) : `${앞글}${'가'.repeat(길이 - 앞글.length)}`;
}

export function 본문글(길이: number, 앞글 = '본문'): string {
  return 글자채우기(`${앞글} `, 길이);
}

export function 그림주소(): string {
  return `data:image/png;base64,${파일만들기('작은.png', 0).buffer.toString('base64')}`;
}

export async function 글목록제목들(api: APIRequestContext, 조건: string): Promise<string[]> {
  const res = await api.get(`/api/posts?${조건}`);
  if (!res.ok()) throw new Error(`글 목록 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: { title: string }[] }).items.map((글) => 글.title);
}

export async function 댓글목록(api: APIRequestContext, 글번호: number): Promise<{ id: number; content: string; deleted: boolean; parentId: number | null }[]> {
  const res = await api.get(`/api/posts/${String(글번호)}/comments`);
  if (!res.ok()) throw new Error(`댓글 목록 조회 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: { id: number; content: string; deleted: boolean; parentId: number | null }[] }).items;
}

export async function 토스트올라옴표본(page: Page): Promise<number[]> {
  return await page.evaluate(
    () =>
      new Promise<number[]>((끝) => {
        const 표본: number[] = [];
        const 재기 = (토스트: Element): void => {
          const 시작 = performance.now();
          const 한번 = (): void => {
            표본.push(토스트.getBoundingClientRect().top);
            if (performance.now() - 시작 < 400) requestAnimationFrame(한번);
            else 끝(표본);
          };
          한번();
        };
        const 이미있는 = document.querySelector('#toast-box .toast');
        if (이미있는 !== null) {
          재기(이미있는);
          return;
        }
        const 지켜보기 = new MutationObserver(() => {
          const 토스트 = document.querySelector('#toast-box .toast');
          if (토스트 === null) return;
          지켜보기.disconnect();
          재기(토스트);
        });
        지켜보기.observe(document.body, { childList: true, subtree: true });
      }),
  );
}

export interface 정리함 {
  더하기(할일: () => Promise<void>): void;
  모두하기(): Promise<void>;
}

export function 정리함만들기(): 정리함 {
  const 할일들: (() => Promise<void>)[] = [];
  return {
    더하기(할일) {
      할일들.push(할일);
    },
    async 모두하기() {
      const 오류들: unknown[] = [];
      for (const 할일 of 할일들.reverse()) {
        try {
          await 할일();
        } catch (err) {
          오류들.push(err);
        }
      }
      if (오류들.length > 0) throw new AggregateError(오류들, '정리하다 실패했다');
    },
  };
}

export async function 로그인해있나(api: APIRequestContext): Promise<boolean> {
  const res = await api.get('/api/session');
  return ((await res.json()) as { user: unknown }).user !== null;
}

export async function 글있나(api: APIRequestContext, 글번호: number): Promise<boolean> {
  const 응답 = await api.get(`/api/posts/${String(글번호)}`);
  return 응답.ok();
}

export async function 글하나쓰기(api: APIRequestContext, 이름: string, 덧붙임: { category?: '자유' | '질문' | '후기'; content?: string; images?: string[] } = {}): Promise<{ id: number; 제목: string; 본문: string }> {
  const 제목 = 표식(이름);
  const 본문 = 덧붙임.content ?? `${이름} 본문입니다. 열 글자를 넘깁니다`;
  const id = await 글만들기(api, { category: 덧붙임.category ?? '자유', title: 제목, content: 본문, ...(덧붙임.images === undefined ? {} : { images: 덧붙임.images }) });
  return { id, 제목, 본문 };
}

export async function 내글제목들(회원: 글쓴이): Promise<string[]> {
  const res = await 회원.api.get(`/api/posts?field=author&q=${encodeURIComponent(회원.정보.name)}&size=50`);
  if (!res.ok()) throw new Error(`내 글 찾기 실패: ${String(res.status())}`);
  return ((await res.json()) as { items: { title: string; authorId: number }[] }).items.filter((글) => 글.authorId === 회원.id).map((글) => 글.title);
}

export async function 아래에있나(위: Locator, 아래: Locator): Promise<boolean> {
  const 위자리 = await 위.boundingBox();
  const 아래자리 = await 아래.boundingBox();
  return 위자리 !== null && 아래자리 !== null && 아래자리.y >= 위자리.y + 위자리.height - 1;
}

export async function 오른쪽아래에있나(칸: Locator, 표시: Locator): Promise<boolean> {
  const 칸자리 = await 칸.boundingBox();
  const 표시자리 = await 표시.boundingBox();
  return 칸자리 !== null && 표시자리 !== null && 표시자리.y >= 칸자리.y + 칸자리.height - 1 && 표시자리.x + 표시자리.width >= 칸자리.x + 칸자리.width - 24;
}

export async function 화면아래가운데에있나(page: Page, 요소: Locator): Promise<boolean> {
  const 자리 = await 요소.boundingBox();
  const 창 = page.viewportSize();
  if (자리 === null || 창 === null) return false;
  return Math.abs(자리.x + 자리.width / 2 - 창.width / 2) <= 창.width / 6 && 자리.y > 창.height / 2;
}

export async function 화면오른쪽아래에있나(page: Page, 요소: Locator): Promise<boolean> {
  const 자리 = await 요소.boundingBox();
  const 창 = page.viewportSize();
  if (자리 === null || 창 === null) return false;
  return 자리.x + 자리.width / 2 > 창.width / 2 && 자리.y + 자리.height / 2 > 창.height / 2;
}

export async function 가짜클립보드(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const 담음 = { 글: '' };
    Object.defineProperty(window, '__가짜클립보드', { value: 담음, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (글: string) => {
          담음.글 = 글;
          return Promise.resolve();
        },
        readText: () => Promise.resolve(담음.글),
      },
      configurable: true,
    });
  });
}

export async function 복사된글(page: Page): Promise<string> {
  return await page.evaluate(() => (window as unknown as { __가짜클립보드: { 글: string } }).__가짜클립보드.글);
}

export function 관리자값(params: { adminId?: string; adminPassword?: string }): { loginId: string; password: string } {
  if (!params.adminId || !params.adminPassword) throw new Error('관리자 계정 비밀값(adminId · adminPassword)이 비어 있다');
  return { loginId: params.adminId, password: params.adminPassword };
}

export async function 세션역할(api: APIRequestContext): Promise<string | undefined> {
  const res = await api.get('/api/session');
  return ((await res.json()) as { user: { role?: string } | null }).user?.role;
}

export async function 저장된임시글(page: Page): Promise<{ category?: string; title?: string; content?: string } | undefined> {
  const 글 = await page.evaluate(() => localStorage.getItem('dm_draft'));
  return 글 === null ? undefined : (JSON.parse(글) as { category?: string; title?: string; content?: string });
}
