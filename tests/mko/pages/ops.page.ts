import type { Locator, Page } from '@playwright/test';

export class 운영툴화면 {
  static readonly 주소 = '/ops';

  readonly 제목: Locator;
  readonly 권한없음제목: Locator;
  readonly 홈으로: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.권한없음제목 = page.getByRole('main').getByRole('heading', { name: '권한이 없습니다' });
    this.홈으로 = page.getByRole('main').getByRole('link', { name: '홈으로' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(운영툴화면.주소);
    await this.제목.waitFor();
  }

  async 제목글자(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }

  async 홈으로누르기(): Promise<void> {
    await this.홈으로.click();
  }
}
