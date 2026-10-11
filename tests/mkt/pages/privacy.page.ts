import type { Locator, Page } from '@playwright/test';

export class 개인정보처리방침화면 {
  static readonly 주소 = '/privacy';

  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 제1조: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '개인정보처리방침', level: 1, exact: true });
    this.본문 = page.getByRole('main').getByRole('article');
    this.제1조 = this.본문.getByText('제1조 (수집하는 개인정보 항목)');
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인정보처리방침화면.주소);
  }

  async 맨위에보이는제목(): Promise<string> {
    const 맨위 = await this.제목.evaluate((el) => el.parentElement?.firstElementChild === el);
    return 맨위 && (await this.제목.isVisible()) ? (await this.제목.innerText()).trim() : '';
  }

  async 조제목들(): Promise<string[]> {
    return (await this.줄들()).filter((줄) => /^제\d+조 \(.+\)$/.test(줄));
  }

  async 끝문장(): Promise<string> {
    return (await this.줄들()).slice(-2).join(' ');
  }

  private async 줄들(): Promise<string[]> {
    return (await this.본문.innerText())
      .split('\n')
      .map((줄) => 줄.trim())
      .filter((줄) => 줄 !== '');
  }
}
