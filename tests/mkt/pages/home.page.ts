import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '데모마켓 홈' });
  }

  get 배너영역(): Locator {
    return this.page.getByRole('region', { name: '배너' });
  }

  get 배너슬라이드(): Locator {
    return this.배너영역.getByRole('group');
  }

  get 배너이전(): Locator {
    return this.배너영역.getByRole('button', { name: '이전', exact: true });
  }

  get 배너다음(): Locator {
    return this.배너영역.getByRole('button', { name: '다음', exact: true });
  }

  배너점(번호: number): Locator {
    return this.배너영역.getByRole('button', { name: `${번호}번 배너`, exact: true });
  }

  get 배너점들(): Locator {
    return this.배너영역.getByRole('button', { name: /번 배너$/ });
  }

  get 배너현재점(): Locator {
    return this.배너영역.locator('button[aria-current="true"]');
  }

  get 이벤트띠(): Locator {
    return this.page.getByRole('region', { name: '이벤트' });
  }

  get 이벤트띠닫기(): Locator {
    return this.이벤트띠.getByRole('button', { name: '닫기' });
  }

  get 카운트다운(): Locator {
    return this.page.getByText('타임세일 종료까지');
  }

  get 인기글탭(): Locator {
    return this.page.getByRole('tab', { name: '인기글' });
  }

  get 최신글탭(): Locator {
    return this.page.getByRole('tab', { name: '최신글' });
  }

  get 글패널(): Locator {
    return this.page.getByRole('tabpanel');
  }

  get 글제목들(): Locator {
    return this.글패널.getByRole('link');
  }

  get 글줄들(): Locator {
    return this.글패널.getByRole('listitem');
  }

  get 추천영역(): Locator {
    return this.page.getByRole('region', { name: '추천 상품' });
  }

  get 추천카드(): Locator {
    return this.추천영역.locator('a.product');
  }

  get 추천줄(): Locator {
    return this.추천영역.locator('.rec-row');
  }

  get 추천다음(): Locator {
    return this.추천영역.getByRole('button', { name: '추천 상품 다음' });
  }

  get 공지팝업(): Locator {
    return this.page.getByRole('dialog', { name: '공지사항' });
  }

  get 공지닫기(): Locator {
    return this.공지팝업.locator('.modal-foot').getByRole('button', { name: '닫기', exact: true });
  }

  get 공지체크(): Locator {
    return this.공지팝업.getByRole('checkbox', { name: '오늘 하루 보지 않기' });
  }

  get 공지바탕(): Locator {
    return this.page.locator('.modal-backdrop');
  }

  get 설문모달(): Locator {
    return this.page.getByRole('dialog', { name: '만족도 설문' });
  }

  get 설문다음에(): Locator {
    return this.설문모달.getByRole('button', { name: '다음에', exact: true });
  }

  get 설문참여하기(): Locator {
    return this.설문모달.getByRole('button', { name: '참여하기', exact: true });
  }

  get 바닥글(): Locator {
    return this.page.getByRole('contentinfo');
  }

  get 이용약관링크(): Locator {
    return this.바닥글.getByRole('link', { name: '이용약관', exact: true });
  }

  get 개인정보링크(): Locator {
    return this.바닥글.getByRole('link', { name: '개인정보처리방침', exact: true });
  }

  get 저작권문구(): Locator {
    return this.바닥글.getByText('© 2026 DemoMarket');
  }

  get 처리중표시(): Locator {
    return this.page.getByLabel('처리 중');
  }

  get 처리중버튼(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: '처리 중' });
  }

  get 머리글바탕(): Locator {
    return this.page.getByRole('banner');
  }

  get 머리글안쪽(): Locator {
    return this.머리글바탕.locator('.header-inner');
  }

  async 내린다(세로: number): Promise<void> {
    await this.page.evaluate((y) => window.scrollTo(0, y), 세로);
  }

  async 한화면내린다(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, window.innerHeight));
  }

  async 스크롤위치(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async 스크롤이닿을때까지기다린다(세로: number): Promise<boolean> {
    return this.page.waitForFunction((y) => window.scrollY === y, 세로, { timeout: 3000 }).then(
      () => true,
      () => false,
    );
  }

  async 문서가화면보다긴가(): Promise<boolean> {
    return this.page
      .waitForFunction(() => document.documentElement.scrollHeight >= window.innerHeight * 2, undefined, { timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
  }

  async 공지팝업이자리잡을때까지기다린다(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 모달 = document.querySelector('.modal');
      return 모달 !== null && getComputedStyle(모달).transform === 'none';
    });
  }

  async 머리글안쪽높이(): Promise<number> {
    const 상자 = await this.머리글안쪽.boundingBox();
    return Math.round(상자?.height ?? 0);
  }

  async 머리글위쪽(): Promise<number> {
    const 상자 = await this.머리글바탕.boundingBox();
    return Math.round(상자?.y ?? -1);
  }

  async 머리글안쪽높이가될때까지기다린다(높이: number): Promise<boolean> {
    return this.page
      .waitForFunction((값) => Math.round(document.querySelector('.header-inner')?.getBoundingClientRect().height ?? 0) === 값, 높이, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
  }

  async 맨위까지기다린다(): Promise<boolean> {
    return this.page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 5000 }).then(
      () => true,
      () => false,
    );
  }

  async 동의기록을지운다(): Promise<void> {
    await this.page.evaluate(() => localStorage.removeItem('dm_cookie_ok'));
  }

  async 다시열고설정응답을기다린다(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((응답) => /\/api\/settings$/.test(응답.url()) && 응답.request().method() === 'GET'),
      this.page.reload(),
    ]);
  }

  async 추천순서(): Promise<string[]> {
    return this.추천카드.evaluateAll((요소들) => 요소들.map((요소) => 요소.getAttribute('href') ?? ''));
  }

  async 추천줄가로위치(): Promise<number> {
    return this.추천줄.evaluate((요소) => 요소.scrollLeft);
  }

  async 추천줄이넘어갈때까지기다린다(): Promise<boolean> {
    return this.page
      .waitForFunction(() => (document.querySelector('.rec-row')?.scrollLeft ?? 0) > 0, undefined, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
  }

  async 열고설정응답을기다린다(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((응답) => /\/api\/settings$/.test(응답.url()) && 응답.request().method() === 'GET'),
      this.열기(),
    ]);
  }

  async 시계를멈춘다(시각: Date, 멈출시각: Date): Promise<void> {
    await this.page.clock.install({ time: 시각 });
    await this.page.clock.pauseAt(멈출시각);
  }

  async 열기(): Promise<void> {
    await this.page.goto('/');
    await this.제목.waitFor({ state: 'attached' });
  }

  async 열고장바구니응답을기다린다(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((응답) => 응답.url().includes('/api/cart') && 응답.request().method() === 'GET'),
      this.열기(),
    ]);
  }

  async 열고알림응답을기다린다(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((응답) => /\/api\/notifications$/.test(응답.url()) && 응답.request().method() === 'GET'),
      this.열기(),
    ]);
  }

  async 쿠키띠를치운다(): Promise<void> {
    await this.page.context().addInitScript(() => {
      localStorage.setItem('dm_cookie_ok', '1');
    });
  }

  async 공지팝업을치운다(): Promise<void> {
    await this.page.context().addInitScript(() => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      localStorage.setItem('dm_notice_hide', `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
    });
  }

  async 설문을치운다(): Promise<void> {
    await this.page.context().addInitScript(() => {
      sessionStorage.setItem('dm_survey_done', '1');
    });
  }

  async 화면너비를맞춘다(너비: number, 높이 = 900): Promise<void> {
    await this.page.setViewportSize({ width: 너비, height: 높이 });
  }

  async 마우스를치운다(): Promise<void> {
    await this.page.mouse.move(0, 0);
  }

  async 메뉴가나올때까지기다린다(): Promise<boolean> {
    return this.page
      .waitForFunction(() => (document.querySelector('nav.gnb')?.getBoundingClientRect().left ?? -1) >= 0, undefined, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
  }
}
