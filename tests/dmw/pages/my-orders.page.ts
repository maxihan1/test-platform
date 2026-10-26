import type { Locator, Page } from '@playwright/test';

export class 주문내역화면 {
  static readonly 주소 = '/my/orders';

  readonly 큰제목: Locator;
  readonly 왼쪽메뉴: Locator;
  readonly 메뉴주문내역: Locator;
  readonly 메뉴회원정보수정: Locator;
  readonly 메뉴회원탈퇴: Locator;
  readonly 강조된메뉴: Locator;
  readonly 기간묶음: Locator;
  readonly 기간1개월: Locator;
  readonly 기간3개월: Locator;
  readonly 기간전체: Locator;
  readonly 눌린기간: Locator;
  readonly 표: Locator;
  readonly 빈안내: Locator;
  readonly 줄들: Locator;
  readonly 주문일들: Locator;
  readonly 주문번호들: Locator;
  readonly 상태들: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '주문 내역' });
    this.왼쪽메뉴 = page.getByRole('navigation', { name: '마이페이지 메뉴' });
    this.메뉴주문내역 = this.왼쪽메뉴.getByRole('link', { name: '주문 내역', exact: true });
    this.메뉴회원정보수정 = this.왼쪽메뉴.getByRole('link', { name: '회원정보 수정', exact: true });
    this.메뉴회원탈퇴 = this.왼쪽메뉴.getByRole('link', { name: '회원 탈퇴', exact: true });
    this.강조된메뉴 = this.왼쪽메뉴.locator('a[aria-current="page"]');
    this.기간묶음 = page.getByRole('group', { name: '조회 기간' });
    this.기간1개월 = this.기간묶음.getByRole('button', { name: '1개월', exact: true });
    this.기간3개월 = this.기간묶음.getByRole('button', { name: '3개월', exact: true });
    this.기간전체 = this.기간묶음.getByRole('button', { name: '전체', exact: true });
    this.눌린기간 = this.기간묶음.getByRole('button', { pressed: true });
    this.표 = page.getByRole('table');
    this.빈안내 = page.getByText('주문 내역이 없습니다', { exact: true });
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('link') });
    this.주문일들 = this.줄들.locator('td:nth-child(1)');
    this.주문번호들 = this.줄들.getByRole('link');
    this.상태들 = this.줄들.locator('td:nth-child(5) span');
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문내역화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.표.or(this.빈안내).waitFor();
  }

  줄(주문번호: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('link', { name: 주문번호, exact: true }) });
  }

  async 기간누르기(버튼: Locator, 기간: '1m' | '3m' | 'all'): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes(`/api/orders?period=${기간}`));
    await 버튼.click();
    await 응답;
    await this.그려질때까지();
  }

  async 주문번호누르기(주문번호: string): Promise<void> {
    await this.주문번호들.filter({ hasText: 주문번호 }).click();
  }
}
