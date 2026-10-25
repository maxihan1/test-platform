import type { Locator, Page } from '@playwright/test';

export class 커뮤니티목록화면 {
  static readonly 주소 = '/board';
  readonly 제목: Locator;
  readonly 표: Locator;
  readonly 공지줄들: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '커뮤니티', level: 1 });
    this.표 = page.getByRole('tabpanel').getByRole('table');
    this.공지줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell', { name: '공지', exact: true }) });
  }

  async 열기(): Promise<void> {
    await this.page.goto(커뮤니티목록화면.주소);
    await this.표.getByRole('link').first().waitFor();
  }

  async 공지번호들(): Promise<number[]> {
    const 주소들 = await this.공지줄들.getByRole('link').evaluateAll((링크들) => 링크들.map((링크) => 링크.getAttribute('href') ?? ''));
    return 주소들.map((주소) => Number(주소.replace(/\D/g, '')));
  }

  공지줄(title: string): Locator {
    return this.공지줄들.filter({ has: this.page.getByRole('link', { name: title, exact: true }) });
  }

  제목링크(title: string): Locator {
    return this.표.getByRole('link', { name: title, exact: true });
  }
}
