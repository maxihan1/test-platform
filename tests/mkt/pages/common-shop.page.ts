import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 맨위로, 바닥글, 상담, 쿠키띠 } from '../components/site-extra.component.js';

export class 쇼핑화면 {
  readonly 제목: Locator;
  readonly 상품카드들: Locator;
  readonly 머리글: 머리글;
  readonly 바닥글: 바닥글;
  readonly 쿠키띠: 쿠키띠;
  readonly 맨위로: 맨위로;
  readonly 상담: 상담;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '쇼핑', level: 1 });
    this.상품카드들 = page.getByRole('main').getByRole('link').filter({ hasText: '원' });
    this.머리글 = new 머리글(page);
    this.바닥글 = new 바닥글(page);
    this.쿠키띠 = new 쿠키띠(page);
    this.맨위로 = new 맨위로(page);
    this.상담 = new 상담(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto('/shop');
    await this.끝까지그려졌나기다리기();
  }

  async 장바구니응답과함께열기(): Promise<void> {
    await Promise.all([this.장바구니응답(), this.page.goto('/shop')]);
    await this.끝까지그려졌나기다리기();
  }

  async 장바구니응답과함께새로고침(): Promise<void> {
    await Promise.all([this.장바구니응답(), this.page.reload()]);
    await this.끝까지그려졌나기다리기();
  }

  private async 장바구니응답(): Promise<void> {
    await this.page.waitForResponse((응답) => 응답.url().endsWith('/api/cart') && 응답.request().method() === 'GET');
  }

  async 배지가빨간가(): Promise<boolean> {
    return this.머리글.장바구니배지.evaluate((el) => {
      const [빨강 = 0, 초록 = 255, 파랑 = 255] = (getComputedStyle(el).backgroundColor.match(/\d+/g) ?? []).map(Number);
      return 빨강 > 150 && 초록 < 100 && 파랑 < 100;
    });
  }

  async 새로고침(): Promise<void> {
    await this.page.reload();
    await this.끝까지그려졌나기다리기();
  }

  async 끝까지그려졌나기다리기(): Promise<void> {
    await this.제목.waitFor();
    await this.상품카드들.nth(11).waitFor();
    await this.머리글.로고.waitFor();
    await this.바닥글.저작권문구.waitFor();
    await this.상담.열기버튼.waitFor();
  }

  async 내리기(픽셀: number): Promise<void> {
    await this.page.evaluate((y) => window.scrollTo(0, y), 픽셀);
    await this.page.waitForFunction((y) => Math.round(window.scrollY) === y, 픽셀);
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }

  async 가로중심(대상: Locator): Promise<number> {
    const 상자 = await 대상.boundingBox();
    if (!상자) throw new Error('요소 위치를 읽지 못했다');
    return 상자.x + 상자.width / 2;
  }

  async 안정된위치(대상: Locator): Promise<{ x: number; width: number }> {
    return 대상.evaluate(
      (el) =>
        new Promise<{ x: number; width: number }>((끝) => {
          let 앞 = '';
          let 같은횟수 = 0;
          const 재기 = () => {
            const 상자 = el.getBoundingClientRect();
            const 지금 = `${Math.round(상자.x)}:${Math.round(상자.width)}`;
            같은횟수 = 지금 === 앞 ? 같은횟수 + 1 : 0;
            앞 = 지금;
            if (같은횟수 >= 10) 끝({ x: Math.round(상자.x), width: Math.round(상자.width) });
            else setTimeout(재기, 40);
          };
          재기();
        }),
    );
  }

  async 화면안에보이나(대상: Locator): Promise<boolean> {
    const 위치 = await this.안정된위치(대상);
    const 창 = this.page.viewportSize();
    if (!창) throw new Error('화면 크기를 읽지 못했다');
    return 위치.x + 위치.width > 0 && 위치.x < 창.width;
  }

  async 안정된머리글높이(): Promise<number> {
    return this.머리글.안쪽.evaluate(
      (el) =>
        new Promise<number>((끝) => {
          let 앞 = -1;
          let 같은횟수 = 0;
          const 재기 = () => {
            const 지금 = Math.round(el.getBoundingClientRect().height);
            같은횟수 = 지금 === 앞 ? 같은횟수 + 1 : 0;
            앞 = 지금;
            if (같은횟수 >= 10) 끝(지금);
            else setTimeout(재기, 40);
          };
          재기();
        }),
    );
  }

  async 머리글붙었나(): Promise<boolean> {
    return this.머리글.영역.evaluate((el) => el.classList.contains('stuck'));
  }

  async 머리글위쪽(): Promise<number> {
    return this.머리글.영역.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  }

  async 머리글밖으로마우스옮기기(): Promise<void> {
    await this.page.mouse.move(10, 400);
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }

  async 쿠키띠가덮고있나(): Promise<boolean> {
    const 상자 = await this.쿠키띠.영역.boundingBox();
    const 창 = this.page.viewportSize();
    if (!상자 || !창) return false;
    const 맨위가쿠키띠인가 = await this.page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('.cookie-bar') !== null,
      [상자.x + 상자.width / 2, 상자.y + 상자.height / 2] as [number, number],
    );
    return 맨위가쿠키띠인가 && Math.abs(상자.y + 상자.height - 창.height) <= 1;
  }
}
