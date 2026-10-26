import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { API로그인, 새비밀번호, 새아이디, 일회용회원만들기 } from './account.helper.js';
import { 두프레임기다리기, 새창묶음 } from './common-tools.helper.js';
import { 글만들기, 글지우기, 댓글달기 } from './data.helper.js';
import { 안내창막기 } from './page-setup.helper.js';

export async function 내이름(page: Page): Promise<string> {
  const res = await page.request.get('/api/session');
  if (!res.ok()) throw new Error(`로그인 정보 요청이 실패했다: ${res.status()}`);
  const 몸 = (await res.json()) as { user: { name: string } | null };
  if (몸.user === null) throw new Error('로그인한 회원이 없어 이름을 읽지 못했다');
  return 몸.user.name;
}

export async function 읽지않은알림만들기(내요청: APIRequestContext, 남요청: APIRequestContext): Promise<number> {
  const 글번호 = await 글만들기(내요청, { title: '알림 시험 글', content: '다른 회원이 댓글을 달면 알림이 오는지 보려고 쓴 글입니다' });
  const 남 = await 일회용회원만들기(남요청, '댓글회원');
  await API로그인(남요청, 남.loginId, 남.password);
  await 댓글달기(남요청, 글번호, '알림 시험 댓글입니다');
  return 글번호;
}

export async function 알림글지우기(내요청: APIRequestContext, 글번호: number | undefined): Promise<void> {
  if (글번호 === undefined) return;
  await 글지우기(내요청, 글번호);
}

export interface 붙잡은응답 {
  놓기(): Promise<void>;
}

export async function 응답붙잡기(page: Page, 주소틀: string): Promise<붙잡은응답> {
  let 풀기: () => void = () => undefined;
  let 끝냄: () => void = () => undefined;
  let 붙잡았나 = false;
  const 대기 = new Promise<void>((끝) => {
    풀기 = 끝;
  });
  const 끝남 = new Promise<void>((끝) => {
    끝냄 = 끝;
  });
  await page.context().route(주소틀, async (경로) => {
    붙잡았나 = true;
    await 대기;
    try {
      await 경로.continue();
    } finally {
      끝냄();
    }
  });
  return {
    async 놓기(): Promise<void> {
      풀기();
      if (붙잡았나) await 끝남;
      await page.context().unroute(주소틀);
    },
  };
}

export async function 맨아래로내리기(page: Page): Promise<void> {
  let 앞높이 = -1;
  for (let 번 = 0; 번 < 12; 번 += 1) {
    const 높이 = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      return document.documentElement.scrollHeight;
    });
    await 두프레임기다리기(page);
    const 끝에닿음 = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1);
    if (높이 === 앞높이 && 끝에닿음) return;
    앞높이 = 높이;
  }
}

export async function 화면밖인가(요소: Locator): Promise<boolean> {
  const 상자 = await 요소.boundingBox();
  if (상자 === null) throw new Error('요소가 화면에 없어 자리를 잴 수 없다');
  return 상자.x + 상자.width <= 0;
}

export async function 화면안인가(page: Page, 요소: Locator): Promise<boolean> {
  const 상자 = await 요소.boundingBox();
  const 크기 = page.viewportSize();
  if (상자 === null || 크기 === null) throw new Error('요소나 화면 크기를 몰라 자리를 잴 수 없다');
  return 상자.x >= 0 && 상자.x + 상자.width <= 크기.width;
}

export async function 화면아래에붙었나(page: Page, 요소: Locator): Promise<boolean> {
  const 상자 = await 요소.boundingBox();
  const 크기 = page.viewportSize();
  if (상자 === null || 크기 === null) throw new Error('요소나 화면 크기를 몰라 자리를 잴 수 없다');
  return Math.round(상자.y + 상자.height) === 크기.height;
}

export async function 가려졌나(요소: Locator): Promise<boolean> {
  return 요소.evaluate((대상) => {
    const 상자 = 대상.getBoundingClientRect();
    const 맨위 = document.elementFromPoint(상자.x + 상자.width / 2, 상자.y + 상자.height / 2);
    return 맨위 !== null && 맨위 !== 대상 && !대상.contains(맨위);
  });
}

export async function 전환길이밀리초(page: Page, 대상: Locator, 속성: string): Promise<number> {
  const 핸들 = await 대상.elementHandle();
  if (핸들 === null) throw new Error('전환을 읽을 요소가 화면에 없다');
  const 읽음 = await page.waitForFunction(
    ({ 요소, 이름 }) => {
      const 전환 = 요소.getAnimations().find((하나) => 하나 instanceof CSSTransition && 하나.transitionProperty === 이름);
      return 전환?.effect ? Number(전환.effect.getTiming().duration) : false;
    },
    { 요소: 핸들, 이름: 속성 },
  );
  return Number(await 읽음.jsonValue());
}

export async function 전환이끝날때까지(요소: Locator): Promise<void> {
  await 요소.evaluate(async (대상) => {
    await Promise.allSettled(대상.getAnimations().map((하나) => 하나.finished));
  });
}

export function 계정값(loginId: string | undefined, password: string | undefined): { 아이디: string; 비밀번호: string } {
  if (loginId === undefined || password === undefined) throw new Error('계정 칸이 비었다 — 실행 설정의 계정이 채워져야 한다');
  return { 아이디: loginId, 비밀번호: password };
}

export async function 시계멈추기(page: Page): Promise<void> {
  const 지금 = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(지금 + 10);
}

export async function 화면가운데인가(page: Page, 요소: Locator): Promise<boolean> {
  const 상자 = await 요소.boundingBox();
  const 크기 = page.viewportSize();
  if (상자 === null || 크기 === null) throw new Error('요소나 화면 크기를 몰라 자리를 잴 수 없다');
  const 가로차 = Math.abs(상자.x + 상자.width / 2 - 크기.width / 2);
  const 세로차 = Math.abs(상자.y + 상자.height / 2 - 크기.height / 2);
  return 가로차 <= 8 && 세로차 <= 8;
}

export async function 글작성시각들(요청: APIRequestContext): Promise<Map<number, number>> {
  const res = await 요청.get('/api/posts?size=1000&sort=latest');
  if (!res.ok()) throw new Error(`글 목록 요청이 실패했다: ${res.status()}`);
  const 몸 = (await res.json()) as { items: { id: number; createdAt: number }[] };
  return new Map(몸.items.map((글) => [글.id, 글.createdAt]));
}

export function 새가입값(이름: string): { loginId: string; password: string; name: string; email: string } {
  const loginId = 새아이디();
  return { loginId, password: 새비밀번호(), name: 이름, email: `${loginId}@example.com` };
}

export async function 화면에글자가있나(page: Page, 글: string): Promise<boolean> {
  return page.evaluate((찾을글) => {
    const 값들 = [...document.querySelectorAll('input,textarea')].map((칸) => (칸 as HTMLInputElement).value);
    return document.documentElement.outerHTML.includes(찾을글) || document.body.innerText.includes(찾을글) || 값들.some((값) => 값.includes(찾을글));
  }, 글);
}

export async function 안내창조절(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const 지금 = new Date();
    const 두자리 = (n: number): string => String(n).padStart(2, '0');
    const 오늘 = `${지금.getFullYear()}-${두자리(지금.getMonth() + 1)}-${두자리(지금.getDate())}`;
    localStorage.setItem('dm_cookie_ok', '1');
    if (sessionStorage.getItem('dm_test_notice') !== '1') localStorage.setItem('dm_notice_hide', 오늘);
    if (sessionStorage.getItem('dm_test_survey') !== '1') sessionStorage.setItem('dm_survey_done', '1');
  });
}

export async function 공지보이게(page: Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.setItem('dm_test_notice', '1');
    localStorage.removeItem('dm_notice_hide');
  });
}

export async function 설문보이게(page: Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.setItem('dm_test_survey', '1');
    sessionStorage.removeItem('dm_survey_done');
  });
}

export async function 안내창다시막기(page: Page): Promise<void> {
  await page.evaluate(() => {
    sessionStorage.removeItem('dm_test_notice');
    sessionStorage.removeItem('dm_test_survey');
  });
}

export async function 로그인쿠키만료일수(page: Page): Promise<number> {
  const 오래가는쿠키 = (await page.context().cookies()).find((쿠키) => 쿠키.expires > 0);
  if (오래가는쿠키 === undefined) return -1;
  return Math.round((오래가는쿠키.expires * 1000 - Date.now()) / 86_400_000);
}

export async function 브라우저다시열기(page: Page): Promise<{ 새쪽: Page; 닫기(): Promise<void> }> {
  const 오래가는쿠키들 = (await page.context().cookies()).filter((쿠키) => 쿠키.expires > 0);
  const 묶음 = await 새창묶음(page);
  await 묶음.addCookies(오래가는쿠키들);
  const 새쪽 = await 묶음.newPage();
  await 안내창막기(새쪽);
  return {
    새쪽,
    async 닫기(): Promise<void> {
      await 묶음.close();
    },
  };
}

export async function 회원정보수정열기(page: Page, 비밀번호: string): Promise<void> {
  await page.goto('/my/profile');
  await page.getByLabel('비밀번호', { exact: true }).fill(비밀번호);
  await page.getByRole('button', { name: '비밀번호 확인', exact: true }).click();
  await page.getByRole('button', { name: '저장', exact: true }).waitFor();
}

export interface 엿본응답 {
  본문(): Promise<string>;
  끝내기(): Promise<void>;
}

export async function 응답본문엿보기(page: Page, 주소틀: string): Promise<엿본응답> {
  let 받음: (글: string) => void = () => undefined;
  const 본문약속 = new Promise<string>((끝) => {
    받음 = 끝;
  });
  await page.context().route(주소틀, async (경로) => {
    const 응답 = await 경로.fetch();
    받음(await 응답.text());
    await 경로.fulfill({ response: 응답 });
  });
  return {
    본문: () => 본문약속,
    async 끝내기(): Promise<void> {
      await page.context().unroute(주소틀);
    },
  };
}
