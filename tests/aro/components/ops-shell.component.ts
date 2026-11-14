import type { Locator, Page } from '@playwright/test';

export type 메뉴이름 = '대시보드' | '유저 · 제재' | '지급 · 회수' | '공지' | '점검' | '기록';

export class 운영틀 {
  readonly 머리줄: Locator;
  readonly 로고: Locator;
  readonly 게임운영: Locator;
  readonly 점검배지: Locator;
  readonly 운영자: Locator;
  readonly 로그아웃: Locator;
  readonly 메뉴: Locator;
  readonly 메뉴링크들: Locator;
  readonly 현재메뉴: Locator;
  readonly 본문: Locator;
  readonly 본문제목: Locator;
  readonly 본문오류: Locator;

  constructor(private readonly page: Page) {
    this.머리줄 = page.locator('header.ops-head');
    this.로고 = this.머리줄.getByRole('link', { name: 'Boss Room', exact: true });
    this.게임운영 = this.머리줄.getByText('게임 운영', { exact: true });
    this.점검배지 = page.locator('#ops-maint');
    this.운영자 = page.locator('#ops-who');
    this.로그아웃 = this.머리줄.getByRole('button', { name: '로그아웃', exact: true });
    this.메뉴 = page.getByRole('navigation', { name: '운영 메뉴' });
    this.메뉴링크들 = this.메뉴.getByRole('link');
    this.현재메뉴 = this.메뉴.locator('a[aria-current="page"]');
    this.본문 = page.locator('#ops-main');
    this.본문제목 = this.본문.getByRole('heading', { level: 1 });
    this.본문오류 = this.본문.locator('.error-text');
  }

  메뉴링크(이름: 메뉴이름): Locator {
    return this.메뉴.getByRole('link', { name: 이름, exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.본문.and(this.page.locator(':not([aria-busy="true"])')).waitFor();
    await this.운영자.filter({ hasText: /\S/ }).waitFor();
  }

  async 메뉴누르기(이름: 메뉴이름): Promise<void> {
    await this.메뉴링크(이름).click();
    await this.본문제목.filter({ hasText: 이름 }).waitFor();
  }

  async 로그아웃누르기(): Promise<void> {
    await this.로그아웃.click();
  }
}
