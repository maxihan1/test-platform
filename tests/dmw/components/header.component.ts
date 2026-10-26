import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  readonly 영역: Locator;
  readonly 로고: Locator;
  readonly 주메뉴: Locator;
  readonly 커뮤니티: Locator;
  readonly 쇼핑: Locator;
  readonly 고객센터: Locator;
  readonly 자유게시판: Locator;
  readonly 질문게시판: Locator;
  readonly 후기게시판: Locator;
  readonly 로그인: Locator;
  readonly 회원가입: Locator;
  readonly 인사: Locator;
  readonly 마이페이지: Locator;
  readonly 관리자: Locator;
  readonly 로그아웃: Locator;
  readonly 장바구니: Locator;
  readonly 장바구니배지: Locator;
  readonly 알림종: Locator;
  readonly 알림수: Locator;
  readonly 알림목록: Locator;
  readonly 햄버거: Locator;
  private readonly 다그림: Locator;

  constructor(private readonly page: Page) {
    this.영역 = page.getByRole('banner');
    this.로고 = this.영역.getByRole('link', { name: '데모마켓', exact: true });
    this.주메뉴 = this.영역.getByRole('navigation', { name: '주 메뉴' });
    this.커뮤니티 = this.주메뉴.getByRole('link', { name: '커뮤니티', exact: true });
    this.쇼핑 = this.주메뉴.getByRole('link', { name: '쇼핑', exact: true });
    this.고객센터 = this.주메뉴.getByRole('link', { name: '고객센터', exact: true });
    this.자유게시판 = this.주메뉴.getByRole('menuitem', { name: '자유게시판' });
    this.질문게시판 = this.주메뉴.getByRole('menuitem', { name: '질문게시판' });
    this.후기게시판 = this.주메뉴.getByRole('menuitem', { name: '후기게시판' });
    this.로그인 = this.영역.getByRole('link', { name: '로그인', exact: true });
    this.회원가입 = this.영역.getByRole('link', { name: '회원가입', exact: true });
    this.인사 = this.영역.locator('.hello');
    this.마이페이지 = this.영역.getByRole('link', { name: '마이페이지', exact: true });
    this.관리자 = this.영역.getByRole('link', { name: '관리자', exact: true });
    this.로그아웃 = this.영역.getByRole('button', { name: '로그아웃', exact: true });
    this.장바구니 = this.영역.getByRole('link', { name: '장바구니' });
    this.장바구니배지 = this.영역.locator('.cart-count');
    this.알림종 = this.영역.getByRole('button', { name: '알림' });
    this.알림수 = this.영역.locator('.bell-count');
    this.알림목록 = this.영역.locator('.bell-list');
    this.햄버거 = this.영역.getByRole('button', { name: '메뉴 열기' });
    this.다그림 = page.locator('#site-header .util').filter({ has: page.locator('a[href="/login"], button.logout') });
  }

  async 그려질때까지(): Promise<void> {
    await this.다그림.waitFor({ state: 'attached' });
  }

  좁은화면인가(): boolean {
    return (this.page.viewportSize()?.width ?? 1280) < 768;
  }

  async 메뉴열기(): Promise<void> {
    await this.그려질때까지();
    if (!this.좁은화면인가()) return;
    if ((await this.햄버거.getAttribute('aria-expanded')) !== 'true') await this.햄버거.click();
  }

  async 메뉴누르기(메뉴: Locator): Promise<void> {
    await this.메뉴열기();
    await 메뉴.click();
  }

  async 로그아웃누르기(): Promise<void> {
    await this.메뉴열기();
    await this.로그아웃.click();
  }
}
