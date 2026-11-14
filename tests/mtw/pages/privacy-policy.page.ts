import type { Locator, Page } from '@playwright/test';

export class 개인정보처리방침화면 {
  static readonly 주소 = '/privacy-policy';

  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 갱신일: Locator;

  constructor(private readonly page: Page) {
    const 영역 = page.getByRole('main').getByRole('region', { name: '개인정보처리방침' });
    this.제목 = 영역.getByRole('heading', { name: '개인정보처리방침', level: 1 });
    this.본문 = 영역.getByRole('paragraph').filter({ hasText: 'This privacy policy describes' });
    this.갱신일 = 영역.getByText('에 마지막으로 업데이트됨');
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인정보처리방침화면.주소);
    await this.제목.waitFor();
  }
}
