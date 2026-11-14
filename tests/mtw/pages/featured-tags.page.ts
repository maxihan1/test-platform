import type { Locator, Page } from '@playwright/test';

export class 추천해시태그편집화면 {
  static readonly 주소 = '/profile/featured_tags';

  readonly 제목: Locator;
  readonly 입력칸: Locator;
  readonly 태그들: Locator;
  readonly 한도안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '태그 편집', level: 1 });
    this.입력칸 = page.getByRole('main').getByRole('combobox', { name: '해시태그를 입력하세요…' });
    this.태그들 = page.getByRole('main').getByRole('heading', { level: 4 });
    this.한도안내 = page.getByText('추천 해시태그 최대 개수를 초과합니다.');
  }

  async 열기(): Promise<void> {
    await this.page.goto(추천해시태그편집화면.주소);
    await this.제목.waitFor();
    await this.입력칸.or(this.한도안내).waitFor();
  }

  태그(이름: string): Locator {
    return this.태그들.filter({ hasText: `#${이름}` });
  }

  async 더하기(이름: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/v1/featured_tags') && r.request().method() === 'POST');
    await this.입력칸.fill(이름);
    await this.입력칸.press('Enter');
    await 응답;
  }
}
