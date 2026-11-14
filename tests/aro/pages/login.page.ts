import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly 제목: Locator;
  readonly 안내: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 로그인버튼: Locator;
  readonly 오류줄: Locator;
  readonly 제출버튼: Locator;
  private 보낸요청 = 0;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'Boss Room 게임 운영', exact: true });
    this.안내 = page.getByText('운영자 계정으로 로그인하세요. 게임 계정으로는 들어올 수 없습니다.', { exact: true });
    this.아이디 = page.getByLabel('아이디', { exact: true });
    this.비밀번호 = page.getByLabel('비밀번호', { exact: true });
    this.로그인버튼 = page.locator('#login-form').getByRole('button', { name: '로그인', exact: true });
    this.오류줄 = page.locator('#login-error');
    this.제출버튼 = page.locator('#login-form button[type="submit"]');
    page.on('request', (요청) => {
      if (요청.method() === 'POST' && new URL(요청.url()).pathname === '/api/login') this.보낸요청 += 1;
    });
  }

  get 로그인요청수(): number {
    return this.보낸요청;
  }

  async 열기(next?: string): Promise<void> {
    await this.page.goto(next === undefined ? 로그인화면.주소 : `${로그인화면.주소}?next=${next}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.로그인버튼.waitFor();
  }

  async 적기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
  }

  async 로그인누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.적기(아이디, 비밀번호);
    await this.로그인누르기();
  }

  async 오류뜰때까지(기다림 = 10_000): Promise<string | null> {
    return this.오류줄.filter({ hasText: /\S/ }).waitFor({ timeout: 기다림 }).then(async () => (await this.오류줄.innerText()).trim(), () => null);
  }

  async 열렸나(next?: string): Promise<boolean> {
    await this.page.goto(next === undefined ? 로그인화면.주소 : `${로그인화면.주소}?next=${next}`);
    return this.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  }

  async 보호화면열기(주소: string): Promise<void> {
    await this.page.goto(주소);
    await this.그려질때까지();
  }

  다음주소(): string | null {
    return new URL(this.page.url()).searchParams.get('next');
  }

  async 탭제목(): Promise<string> {
    return this.page.title();
  }

  async 비밀번호에서엔터(): Promise<void> {
    await this.비밀번호.press('Enter');
  }

  async 로그인하고응답받기(아이디: string, 비밀번호: string): Promise<number> {
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/login');
    await this.로그인(아이디, 비밀번호);
    return (await 응답).status();
  }
}
