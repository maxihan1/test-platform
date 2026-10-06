import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  readonly 영역: Locator;
  readonly 로고: Locator;
  readonly 주메뉴: Locator;
  readonly 커뮤니티메뉴: Locator;
  readonly 쇼핑메뉴: Locator;
  readonly 고객센터메뉴: Locator;
  readonly 하위메뉴: Locator;
  readonly 로그인링크: Locator;
  readonly 회원가입링크: Locator;
  readonly 인사: Locator;
  readonly 마이페이지링크: Locator;
  readonly 관리자링크: Locator;
  readonly 로그아웃버튼: Locator;
  readonly 알림종: Locator;
  readonly 알림수: Locator;
  readonly 알림목록: Locator;
  readonly 장바구니링크: Locator;
  readonly 장바구니배지: Locator;
  readonly 햄버거: Locator;
  readonly 안쪽: Locator;

  constructor(page: Page) {
    this.영역 = page.locator('#site-header');
    this.로고 = this.영역.getByRole('link', { name: '데모마켓', exact: true });
    this.주메뉴 = this.영역.getByRole('navigation', { name: '주 메뉴' });
    this.커뮤니티메뉴 = this.주메뉴.getByRole('link', { name: '커뮤니티', exact: true });
    this.쇼핑메뉴 = this.주메뉴.getByRole('link', { name: '쇼핑', exact: true });
    this.고객센터메뉴 = this.주메뉴.getByRole('link', { name: '고객센터', exact: true });
    this.하위메뉴 = this.주메뉴.getByRole('menu');
    this.로그인링크 = this.영역.getByRole('link', { name: '로그인', exact: true });
    this.회원가입링크 = this.영역.getByRole('link', { name: '회원가입', exact: true });
    this.인사 = this.영역.locator('.hello');
    this.마이페이지링크 = this.영역.getByRole('link', { name: '마이페이지', exact: true });
    this.관리자링크 = this.영역.getByRole('link', { name: '관리자', exact: true });
    this.로그아웃버튼 = this.영역.getByRole('button', { name: '로그아웃', exact: true });
    this.알림종 = this.영역.getByRole('button', { name: '알림' });
    this.알림수 = this.영역.locator('.bell-count');
    this.알림목록 = this.영역.locator('.bell-list');
    this.장바구니링크 = this.영역.getByRole('link', { name: '장바구니' });
    this.장바구니배지 = this.영역.locator('.cart-count');
    this.햄버거 = this.영역.getByRole('button', { name: '메뉴 열기' });
    this.안쪽 = this.영역.locator('.header-inner');
  }

  하위메뉴항목(이름: string): Locator {
    return this.하위메뉴.getByRole('menuitem', { name: 이름, exact: true });
  }

  async 커뮤니티에마우스올리기(): Promise<void> {
    await this.커뮤니티메뉴.hover();
  }

  async 로그인됐나기다리기(): Promise<void> {
    await this.로그아웃버튼.waitFor();
  }

  async 로그아웃됐나기다리기(): Promise<void> {
    await this.로그인링크.waitFor();
  }
}
