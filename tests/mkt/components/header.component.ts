import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  readonly 영역: Locator;
  readonly 로고: Locator;
  readonly 주메뉴: Locator;
  readonly 햄버거: Locator;
  readonly 로그인링크: Locator;
  readonly 회원가입링크: Locator;
  readonly 인사: Locator;
  readonly 마이페이지링크: Locator;
  readonly 관리자링크: Locator;
  readonly 로그아웃버튼: Locator;
  readonly 장바구니링크: Locator;
  readonly 장바구니배지: Locator;
  readonly 알림종: Locator;
  readonly 알림수: Locator;
  readonly 알림목록: Locator;
  readonly 하위메뉴: Locator;

  constructor(readonly page: Page) {
    this.영역 = page.locator('#site-header');
    this.로고 = this.영역.getByRole('link', { name: '데모마켓', exact: true });
    this.주메뉴 = this.영역.getByRole('navigation', { name: '주 메뉴' });
    this.햄버거 = this.영역.getByRole('button', { name: '메뉴 열기' });
    this.로그인링크 = this.영역.getByRole('link', { name: '로그인', exact: true });
    this.회원가입링크 = this.영역.getByRole('link', { name: '회원가입', exact: true });
    this.인사 = this.영역.locator('.hello');
    this.마이페이지링크 = this.영역.getByRole('link', { name: '마이페이지', exact: true });
    this.관리자링크 = this.영역.getByRole('link', { name: '관리자', exact: true });
    this.로그아웃버튼 = this.영역.getByRole('button', { name: '로그아웃', exact: true });
    this.장바구니링크 = this.영역.getByRole('link', { name: '장바구니' });
    this.장바구니배지 = this.영역.locator('.cart-count');
    this.알림종 = this.영역.getByRole('button', { name: '알림' });
    this.알림수 = this.영역.locator('.bell-count');
    this.알림목록 = this.영역.locator('.bell-list');
    this.하위메뉴 = this.영역.locator('.sub[role="menu"]');
  }

  메뉴(이름: string): Locator {
    return this.주메뉴.getByRole('link', { name: 이름, exact: true });
  }

  하위메뉴항목(이름: string): Locator {
    return this.영역.getByRole('menuitem', { name: 이름 });
  }

  좁은가(): boolean {
    return (this.page.viewportSize()?.width ?? 1280) < 768;
  }

  async 그려질때까지(): Promise<void> {
    await this.영역.locator('a[href="/login"], .logout').first().waitFor({ state: 'attached' });
  }

  async 로그인꼴일때까지(): Promise<void> {
    await this.영역.locator('.logout').waitFor({ state: 'attached' });
  }

  async 로그아웃꼴일때까지(): Promise<void> {
    await this.영역.locator('a[href="/login"]').waitFor({ state: 'attached' });
  }

  async 좁으면메뉴열기(): Promise<void> {
    if (!this.좁은가()) return;
    if ((await this.햄버거.getAttribute('aria-expanded')) === 'true') return;
    await this.햄버거.click();
  }

  async 메뉴누르기(이름: string): Promise<void> {
    await this.그려질때까지();
    await this.좁으면메뉴열기();
    await this.메뉴(이름).click();
  }

  async 링크누르기(링크: Locator): Promise<void> {
    await this.그려질때까지();
    await this.좁으면메뉴열기();
    await 링크.click();
  }
}
