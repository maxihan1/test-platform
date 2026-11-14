import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/auth/sign_in';

  readonly 제목: Locator;
  readonly 이메일칸: Locator;
  readonly 암호칸: Locator;
  readonly 로그인버튼: Locator;
  readonly 등록하기: Locator;
  readonly 암호잊음: Locator;
  readonly 확인링크못받음: Locator;
  readonly 오류안내: Locator;
  readonly 안내문: Locator;
  readonly 머리로고: Locator;
  readonly 보안토큰: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'mastodon.maxihan.com에 로그인' });
    this.이메일칸 = page.getByRole('textbox', { name: '이메일 주소' });
    this.암호칸 = page.getByRole('textbox', { name: '암호' });
    this.로그인버튼 = page.getByRole('button', { name: '로그인' });
    this.등록하기 = page.getByRole('link', { name: '등록하기' });
    this.암호잊음 = page.getByRole('link', { name: '암호를 잊었나요?' });
    this.확인링크못받음 = page.getByRole('link', { name: '확인 링크를 못 받았나요?' });
    this.오류안내 = page.locator('.flash-message');
    this.안내문 = page.getByText('만약 내 계정이 다른 서버에 존재한다면, 여기서는 로그인 할 수 없습니다.');
    this.머리로고 = page.getByRole('banner').getByRole('link', { name: 'Mastodon' });
    this.보안토큰 = page.locator('input[name="authenticity_token"]');
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
    await this.로그인버튼.waitFor();
  }

  async 로그인(아이디: string, 암호: string): Promise<void> {
    await this.이메일칸.fill(아이디);
    await this.암호칸.fill(암호);
    await this.로그인버튼.click();
  }

  async 그려질때까지(): Promise<void> {
    await this.로그인버튼.waitFor();
  }

  async 보안토큰바꾸기(값: string): Promise<void> {
    await this.보안토큰.evaluate((칸, 새값) => {
      (칸 as HTMLInputElement).value = 새값;
    }, 값);
  }

  안내(문구: string): Locator {
    return this.오류안내.filter({ hasText: 문구 });
  }

  async 로그인실패안내읽기(아이디: string, 암호: string): Promise<string> {
    await this.열기();
    await this.로그인(아이디, 암호);
    await this.오류안내.waitFor();
    return (await this.오류안내.innerText()).trim();
  }

  async 로그인한채열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
  }

  문구(글: string): Locator {
    return this.page.getByText(글);
  }

  async 누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인되는가(아이디: string, 암호: string): Promise<boolean> {
    await this.열기();
    await this.로그인(아이디, 암호);
    return this.page.waitForURL((주소) => !주소.pathname.startsWith(로그인화면.주소), { timeout: 10_000 }).then(() => true, () => false);
  }
}
