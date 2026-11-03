import type { Locator, Page } from '@playwright/test';

export class 운영틀 {
  readonly 머리줄: Locator;
  readonly 로고: Locator;
  readonly 쇼핑몰열기: Locator;
  readonly 관리자이름: Locator;
  readonly 로그아웃: Locator;
  readonly 메뉴: Locator;
  readonly 본문: Locator;
  readonly 확인창: Locator;

  constructor(readonly page: Page) {
    this.머리줄 = page.locator('header.ops-head');
    this.로고 = this.머리줄.getByRole('link', { name: '데모마켓' });
    this.쇼핑몰열기 = this.머리줄.getByRole('link', { name: /쇼핑몰 열기/ });
    this.관리자이름 = page.locator('#ops-who');
    this.로그아웃 = this.머리줄.getByRole('button', { name: '로그아웃' });
    this.메뉴 = page.getByRole('navigation', { name: '운영 메뉴' });
    this.본문 = page.locator('#ops-main');
    this.확인창 = page.getByRole('dialog');
  }

  메뉴항목(name: string): Locator {
    return this.메뉴.getByRole('link', { name, exact: name !== '문의' });
  }

  get 지금메뉴(): Locator {
    return this.메뉴.locator('a[aria-current="page"]');
  }

  get 답변대기건수(): Locator {
    return this.page.locator('#ops-waiting');
  }

  async 다그려질때까지(): Promise<void> {
    await this.page.locator('#ops-main[aria-busy="true"]').waitFor({ state: 'detached' });
  }

  창버튼(name: string): Locator {
    return this.확인창.getByRole('button', { name, exact: true });
  }
}
