import type { Locator, Page } from '@playwright/test';

export class 확인링크재전송화면 {
  static readonly 주소 = '/auth/confirmation/new';

  readonly 제목: Locator;
  readonly 이메일칸: Locator;
  readonly 보내기: Locator;
  readonly 로그인: Locator;
  readonly 등록하기: Locator;
  readonly 암호잊음: Locator;
  readonly 결과안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '확인 링크 다시 보내기' });
    this.이메일칸 = page.getByRole('textbox', { name: '이메일 주소' });
    this.보내기 = page.getByRole('button', { name: '확인 링크 다시 보내기' });
    this.로그인 = page.getByRole('link', { name: '로그인' });
    this.등록하기 = page.getByRole('link', { name: '등록하기' });
    this.암호잊음 = page.getByRole('link', { name: '암호를 잊었나요?' });
    this.결과안내 = page.locator('.flash-message');
  }

  async 열기(): Promise<void> {
    await this.page.goto(확인링크재전송화면.주소);
    await this.보내기.waitFor();
  }

  async 보내기누르기(이메일: string): Promise<void> {
    await this.이메일칸.fill(이메일);
    await this.보내기.click();
  }

  async 누르고나간요청수(): Promise<number> {
    let 수 = 0;
    const 세기 = (요청: { method(): string }): void => {
      if (요청.method() === 'POST') 수 += 1;
    };
    this.page.on('request', 세기);
    try {
      await this.보내기.click();
      await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
    } finally {
      this.page.off('request', 세기);
    }
    return 수;
  }
}
