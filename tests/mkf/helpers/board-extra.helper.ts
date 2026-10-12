import type { APIRequestContext, Locator, Page, Route } from '@playwright/test';

import { 댓글달기 } from './board.helper.js';
import { 글하나쓰기, 둘째회원열기, 둘째회원정리하기 } from './board-tools.helper.js';
import type { 둘째회원, 정리함 } from './board-tools.helper.js';

export async function 배경색(칸: Locator): Promise<string> {
  return await 칸.evaluate((el) => getComputedStyle(el).backgroundColor);
}

export async function 덮고있나(띠: Locator, 아래: Locator): Promise<boolean> {
  const 아래자리 = await 아래.boundingBox();
  if (아래자리 === null) return false;
  return await 띠.evaluate((el, 밑) => {
    const 위자리 = el.getBoundingClientRect();
    const 겹친다 = 위자리.top < 밑.y + 밑.height && 위자리.bottom > 밑.y;
    const 맨위 = document.elementFromPoint(위자리.left + 위자리.width / 2, 위자리.top + 위자리.height / 2);
    return 겹친다 && 맨위 !== null && el.contains(맨위);
  }, 아래자리);
}

export async function 마지막쪽번호(api: APIRequestContext): Promise<number> {
  const res = await api.get('/api/posts?size=10');
  if (!res.ok()) throw new Error(`글 목록 조회 실패: ${String(res.status())}`);
  const { total } = (await res.json()) as { total: number };
  return Math.max(1, Math.ceil(total / 10));
}

export function 로그인단추(폼: Locator): Locator {
  return 폼.getByRole('button');
}

export function 로그인로딩표시(폼: Locator): Locator {
  return 로그인단추(폼).getByLabel('처리 중');
}

export interface 알림상황 {
  글쓴: 둘째회원;
  남: 둘째회원;
  글번호: number;
  제목: string;
}

export async function 알림상황만들기(page: Page, 정리: 정리함, 댓글?: string): Promise<알림상황> {
  const 글쓴 = await 둘째회원열기(page);
  정리.더하기(() => 둘째회원정리하기(글쓴));
  const 남 = await 둘째회원열기(page);
  정리.더하기(() => 둘째회원정리하기(남));
  const 글 = await 글하나쓰기(글쓴.api, '알림글');
  if (댓글 !== undefined) await 댓글달기(남.api, 글.id, 댓글);
  return { 글쓴, 남, 글번호: 글.id, 제목: 글.제목 };
}

export async function 나타날때불투명도기록(page: Page, 선택자: string): Promise<void> {
  await page.addInitScript((대상) => {
    const 값들: number[] = [];
    Object.defineProperty(window, '__불투명도기록', { value: 값들, configurable: true });
    const 시작 = performance.now();
    const 보기 = (): void => {
      const el = document.querySelector(대상);
      if (el !== null) 값들.push(Number(getComputedStyle(el).opacity));
      if (performance.now() - 시작 < 3000) requestAnimationFrame(보기);
    };
    requestAnimationFrame(보기);
  }, 선택자);
}

export async function 불투명도기록읽기(page: Page): Promise<number[]> {
  return await page.evaluate(() => (window as unknown as { __불투명도기록: number[] }).__불투명도기록);
}

export async function 좋아요되돌리기(api: APIRequestContext, 글번호: number): Promise<void> {
  const 글 = await api.get(`/api/posts/${String(글번호)}`);
  if (!글.ok()) throw new Error(`글 조회 실패: ${String(글.status())}`);
  if (((await 글.json()) as { liked: boolean }).liked) {
    const 응답 = await api.post(`/api/posts/${String(글번호)}/like`);
    if (!응답.ok()) throw new Error(`좋아요 되돌리기 실패: ${String(응답.status())}`);
  }
}

export async function 응답본문엿보기(page: Page, 주소패턴: string): Promise<{ 본문: () => string; 풀기: () => Promise<void> }> {
  let 담음 = '';
  const 처리 = async (route: Route): Promise<void> => {
    const 응답 = await route.fetch();
    담음 = await 응답.text();
    await route.fulfill({ response: 응답 });
  };
  await page.context().route(주소패턴, 처리);
  return {
    본문: () => 담음,
    풀기: async () => {
      await page.context().unroute(주소패턴, 처리);
    },
  };
}
