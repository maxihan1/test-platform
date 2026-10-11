import type { APIRequestContext, BrowserContext, Locator, Page, Route } from '@playwright/test';

export async function 일부막기(page: Page, 막을것: { 쿠키?: boolean; 공지?: boolean; 설문?: boolean }): Promise<void> {
  await page.addInitScript((값) => {
    const d = new Date();
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    const 오늘 = `${d.getFullYear()}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())}`;
    try {
      if (값.쿠키) localStorage.setItem('dm_cookie_ok', '1');
      if (값.공지) localStorage.setItem('dm_notice_hide', 오늘);
      if (값.설문) sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  }, { 쿠키: 막을것.쿠키 === true, 공지: 막을것.공지 === true, 설문: 막을것.설문 === true });
}

export async function 안정될때까지읽기<T>(읽기: () => Promise<T>, 제한 = 3000): Promise<T> {
  const 끝 = Date.now() + 제한;
  let 앞 = await 읽기();
  let 같은횟수 = 0;
  while (Date.now() < 끝 && 같은횟수 < 3) {
    await new Promise((r) => setTimeout(r, 100));
    const 지금 = await 읽기();
    if (JSON.stringify(지금) === JSON.stringify(앞)) {
      같은횟수 += 1;
    } else {
      같은횟수 = 0;
      앞 = 지금;
    }
  }
  return 앞;
}

export async function 곧보이는가(칸: Locator, 제한 = 3000): Promise<boolean> {
  return 칸.first().waitFor({ state: 'visible', timeout: 제한 }).then(
    () => true,
    () => false,
  );
}

export async function 두프레임기다리기(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
}

export async function 화면내리기(page: Page, 위치: number): Promise<number> {
  await page.evaluate((값) => window.scrollTo({ top: 값, behavior: 'instant' }), 위치);
  await 두프레임기다리기(page);
  return page.evaluate(() => window.scrollY);
}

export async function 응답고쳐걸기(
  context: BrowserContext,
  패턴: RegExp,
  고치기: (본문: Record<string, unknown>) => Record<string, unknown>,
): Promise<() => Promise<void>> {
  const 처리 = async (route: Route) => {
    const 원래 = await route.fetch();
    const 본문 = (await 원래.json()) as Record<string, unknown>;
    await route.fulfill({ response: 원래, json: 고치기(본문) });
  };
  await context.route(패턴, 처리);
  return () => context.unroute(패턴, 처리);
}

export async function 응답붙잡기(context: BrowserContext, 패턴: RegExp): Promise<{ 놓기: () => void; 풀기: () => Promise<void> }> {
  let 놓기: () => void = () => undefined;
  const 신호 = new Promise<void>((끝) => {
    놓기 = 끝;
  });
  const 처리 = async (route: Route) => {
    await 신호;
    await route.continue();
  };
  await context.route(패턴, 처리);
  return { 놓기, 풀기: () => context.unroute(패턴, 처리) };
}

export async function 문의수읽기(req: APIRequestContext): Promise<number> {
  const res = await req.get('/api/inquiries');
  if (!res.ok()) throw new Error(`문의 목록 읽기 실패: ${res.status()}`);
  return ((await res.json()) as { items: unknown[] }).items.length;
}

export async function 알림모두읽기(req: APIRequestContext): Promise<void> {
  await req.post('/api/notifications/read');
}

export async function 게시판고른탭(page: Page): Promise<string> {
  const 탭 = page.getByRole('tablist', { name: '분류' }).getByRole('tab');
  await 탭.first().waitFor();
  const 고른것 = await 탭.evaluateAll((목록) => 목록.filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.textContent ?? ''));
  return 고른것.join(',');
}

export async function 쿠키띠가내용을덮는가(page: Page): Promise<boolean> {
  return page.getByRole('region', { name: '쿠키 안내' }).evaluate((띠) => {
    const 상자 = 띠.getBoundingClientRect();
    const 위 = document.elementFromPoint(상자.left + 상자.width / 2, 상자.top + 상자.height / 2);
    return getComputedStyle(띠).position === 'fixed' && 위 !== null && 띠.contains(위) && Math.round(상자.bottom) === window.innerHeight;
  });
}

export async function 가운데에보이는가(page: Page, 창: Locator): Promise<boolean> {
  const 상자 = await 창.boundingBox();
  const 크기 = page.viewportSize();
  if (상자 === null || 크기 === null) return false;
  return Math.abs(상자.x + 상자.width / 2 - 크기.width / 2) < 4 && Math.abs(상자.y + 상자.height / 2 - 크기.height / 2) < 60;
}

export function 하나만맞는검색어(faq: { question: string; answer: string }[]): string {
  const 찾음 = faq.find((f) => faq.filter((g) => g.question.includes(f.question) || g.answer.includes(f.question)).length === 1);
  if (찾음 === undefined) throw new Error('질문이나 답에 하나만 맞는 글자가 없다');
  return 찾음.question;
}

export async function 게시글제목기다리기(page: Page, 제목: string): Promise<void> {
  await page.getByRole('heading', { name: 제목, level: 1 }).waitFor();
}

export async function 내주문들읽기(req: APIRequestContext): Promise<{ id: string; status: string }[]> {
  const res = await req.get('/api/orders?period=all&size=100');
  if (!res.ok()) throw new Error(`주문 목록 읽기 실패: ${res.status()}`);
  return ((await res.json()) as { items: { id: string; status: string }[] }).items;
}

export async function FAQ읽기(req: APIRequestContext): Promise<{ category: string; question: string; answer: string }[]> {
  const res = await req.get('/api/faq');
  if (!res.ok()) throw new Error(`FAQ 읽기 실패: ${res.status()}`);
  return ((await res.json()) as { items: { category: string; question: string; answer: string }[] }).items;
}
