import type { Locator, Page } from '@playwright/test';

export class 홈배너 {
  readonly 영역: Locator;
  readonly 장들: Locator;
  readonly 장제목들: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 점들: Locator;
  readonly 현재점: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('region', { name: '배너' });
    this.장들 = this.영역.locator('.slide');
    this.장제목들 = this.장들.getByRole('heading', { level: 2 });
    this.이전 = this.영역.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.영역.getByRole('button', { name: '다음', exact: true });
    this.점들 = this.영역.getByRole('button', { name: /번 배너$/ });
    this.현재점 = this.영역.locator('button[aria-current="true"]');
  }

  점(차례: number): Locator {
    return this.영역.getByRole('button', { name: `${차례}번 배너`, exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.점(1).waitFor();
  }

  async 현재장(): Promise<number> {
    const 이름 = await this.현재점.getAttribute('aria-label');
    return Number((이름 ?? '').replace('번 배너', ''));
  }
}
