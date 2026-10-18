import type { APIRequestContext, Locator, Page, Route } from '@playwright/test';
import { 두프레임뒤 } from './common-tools.helper.js';

export interface 전환기록줄 {
  종류: string;
  이름: string;
  대상: string;
  시간: string;
  첫변형: string;
}

export async function 나타났나(요소: Locator, 제한 = 5000): Promise<boolean> {
  try {
    await 요소.waitFor({ state: 'visible', timeout: 제한 });
    return true;
  } catch (오류) {
    if (오류 instanceof Error && 오류.name === 'TimeoutError') return false;
    throw 오류;
  }
}

export async function 사라졌나(요소: Locator, 제한 = 5000): Promise<boolean> {
  try {
    await 요소.waitFor({ state: 'hidden', timeout: 제한 });
    return true;
  } catch (오류) {
    if (오류 instanceof Error && 오류.name === 'TimeoutError') return false;
    throw 오류;
  }
}

export async function 전환기록하기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const 기록: 전환기록줄[] = [];
    (window as unknown as { __전환기록: 전환기록줄[] }).__전환기록 = 기록;
    const 클래스 = (대상: EventTarget | null): string => (대상 instanceof Element ? String(대상.className) : '');
    document.addEventListener(
      'transitionrun',
      (e) => {
        const 대상 = e.target instanceof Element ? e.target : null;
        기록.push({ 종류: '전환', 이름: e.propertyName, 대상: 클래스(e.target), 시간: 대상 ? getComputedStyle(대상).transitionDuration : '', 첫변형: '' });
      },
      true,
    );
    document.addEventListener(
      'animationstart',
      (e) => {
        const 대상 = e.target instanceof Element ? e.target : null;
        const 움직임 = 대상?.getAnimations().find((a) => 'animationName' in a && a.animationName === e.animationName);
        const 첫 = (움직임?.effect as KeyframeEffect | null | undefined)?.getKeyframes()[0];
        기록.push({ 종류: '움직임', 이름: e.animationName, 대상: 클래스(e.target), 시간: 대상 ? getComputedStyle(대상).animationDuration : '', 첫변형: String(첫?.transform ?? '') });
      },
      true,
    );
  });
}

export async function 전환기록비우기(page: Page): Promise<void> {
  await page.evaluate(() => {
    const 기록 = (window as unknown as { __전환기록: unknown[] }).__전환기록;
    기록.length = 0;
  });
}

export async function 전환기록읽기(page: Page): Promise<전환기록줄[]> {
  return page.evaluate(() => [...(window as unknown as { __전환기록: 전환기록줄[] }).__전환기록]);
}

export async function 창높이만큼내리기(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, window.innerHeight));
  await 두프레임뒤(page);
}

export async function 세로위치읽기(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

export async function 가짜알림응답걸기(page: Page, 읽지않은: number[]): Promise<() => Promise<void>> {
  let 번째 = 0;
  const 처리 = async (route: Route) => {
    const 값 = 읽지않은[Math.min(번째, 읽지않은.length - 1)] ?? 0;
    번째 += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], unread: 값 }) });
  };
  await page.context().route('**/api/notifications', 처리);
  return () => page.context().unroute('**/api/notifications', 처리);
}

export async function 가짜배너응답걸기(page: Page, 배너: unknown[]): Promise<() => Promise<void>> {
  const 처리 = async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: 배너 }) });
  };
  await page.context().route('**/api/banners', 처리);
  return () => page.context().unroute('**/api/banners', 처리);
}

export async function 가짜설정응답걸기(page: Page, 고칠것: { noticePopup: boolean }): Promise<() => Promise<void>> {
  const 처리 = async (route: Route) => {
    const 실제 = await route.fetch();
    const 본문 = (await 실제.json()) as { noticePopup: boolean; unstable: boolean };
    await route.fulfill({ response: 실제, json: { ...본문, ...고칠것 } });
  };
  await page.context().route('**/api/settings', 처리);
  return () => page.context().unroute('**/api/settings', 처리);
}

export async function 실제배너목록(요청: APIRequestContext): Promise<{ id: number; title: string; subtitle: string; color: string; visible: boolean }[]> {
  const 응답 = await 요청.get('/api/banners');
  if (응답.status() !== 200) throw new Error(`배너 조회가 실패했다: ${응답.status()}`);
  return ((await 응답.json()) as { items: { id: number; title: string; subtitle: string; color: string; visible: boolean }[] }).items;
}

export async function 이벤트띠응답늦추기(page: Page): Promise<{ 풀기: () => void; 걷기: () => Promise<void> }> {
  let 풀기!: () => void;
  const 신호 = new Promise<void>((끝) => {
    풀기 = 끝;
  });
  const 처리 = async (route: Route) => {
    await 신호;
    await route.continue();
  };
  await page.context().route('**/api/event-strip', 처리);
  return { 풀기, 걷기: () => page.context().unroute('**/api/event-strip', 처리) };
}

export function 아래에서시작하나(첫변형: string): boolean {
  const 이동 = /translateY\((-?[\d.]+)px\)/.exec(첫변형);
  if (이동) return Number(이동[1]) > 0;
  const 행렬 = /matrix\(([^)]*)\)/.exec(첫변형);
  if (!행렬) return false;
  const 값 = (행렬[1] ?? '').split(',').map((글) => Number(글.trim()));
  return (값[5] ?? 0) > 0;
}

export async function 전환기록기다리기(page: Page, 종류: string, 이름: string, 제한 = 5000): Promise<boolean> {
  try {
    await page.waitForFunction(
      ([찾는종류, 찾는이름]) =>
        (window as unknown as { __전환기록: 전환기록줄[] }).__전환기록.some((줄) => 줄.종류 === 찾는종류 && 줄.이름 === 찾는이름),
      [종류, 이름] as const,
      { timeout: 제한 },
    );
    return true;
  } catch (오류) {
    if (오류 instanceof Error && 오류.name === 'TimeoutError') return false;
    throw 오류;
  }
}

export async function 입력칸이름표(page: Page): Promise<{ 칸수: number; 이름표없는칸: string[] }> {
  return page.locator('main').evaluate((본문) => {
    const 칸들 = Array.from(본문.querySelectorAll('input, select, textarea')).filter((칸) => (칸 as HTMLInputElement).type !== 'hidden');
    const 이름표없는칸 = 칸들
      .filter((칸) => Array.from((칸 as HTMLInputElement).labels ?? []).every((라벨) => (라벨.textContent ?? '').trim() === ''))
      .map((칸) => (칸 as HTMLInputElement).dataset.k ?? 칸.id);
    return { 칸수: 칸들.length, 이름표없는칸 };
  });
}

export async function 응답본문모으기(page: Page, 주소들: string[]): Promise<{ 본문들: Record<string, string[]>; 걷기: () => Promise<void> }> {
  const 본문들: Record<string, string[]> = {};
  const 처리 = new Map<string, (route: Route) => Promise<void>>();
  for (const 주소 of 주소들) {
    본문들[주소] = [];
    const 함수 = async (route: Route) => {
      const 응답 = await route.fetch();
      본문들[주소]?.push(await 응답.text());
      await route.fulfill({ response: 응답 });
    };
    처리.set(주소, 함수);
    await page.context().route(`**${주소}`, 함수);
  }
  return {
    본문들,
    걷기: async () => {
      for (const [주소, 함수] of 처리) await page.context().unroute(`**${주소}`, 함수);
    },
  };
}

export async function 토스트움직임읽기(page: Page): Promise<{ 이름: string; 시간: string; 첫변형: string }> {
  return page.evaluate(() => {
    const 토스트 = document.querySelector('#toast-box .toast');
    if (!토스트) return { 이름: '', 시간: '', 첫변형: '' };
    const 모양 = getComputedStyle(토스트);
    let 첫변형 = '';
    for (const 시트 of Array.from(document.styleSheets)) {
      for (const 규칙 of Array.from(시트.cssRules)) {
        if (규칙 instanceof CSSKeyframesRule && 규칙.name === 모양.animationName) {
          첫변형 = (규칙.cssRules[0] as CSSKeyframeRule).style.getPropertyValue('transform');
        }
      }
    }
    return { 이름: 모양.animationName, 시간: 모양.animationDuration, 첫변형 };
  });
}

export async function 팝업배경전환읽기(page: Page): Promise<{ 속성: string; 시간: string }> {
  return page.evaluate(() => {
    const 배경 = document.querySelector('.modal-backdrop');
    if (!배경) return { 속성: '', 시간: '' };
    const 모양 = getComputedStyle(배경);
    return { 속성: 모양.transitionProperty, 시간: 모양.transitionDuration };
  });
}
