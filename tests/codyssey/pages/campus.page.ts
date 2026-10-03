import type { Locator, Page } from '@playwright/test';

export class 캠퍼스화면 {
  readonly 제목: Locator;
  readonly 캠퍼스카드: Locator;
  readonly 경남카드: Locator;
  readonly 경남점: Locator;
  private readonly 선택된서울카드: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '캠퍼스 안내', level: 1 });
    this.캠퍼스카드 = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'GO', exact: true }) });
    this.경남카드 = page.getByRole('listitem').filter({ hasText: 'Codyssey 경남' });
    this.경남점 = page.locator('.campus-map rect:last-of-type');
    this.선택된서울카드 = page.locator('.campus-info li.active').filter({ hasText: 'Codyssey 서울' });
  }

  구역제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/about/campus');
  }

  async 경남카드선택됨(): Promise<boolean> {
    return this.경남카드.evaluate((카드) => 카드.classList.contains('active'));
  }

  async 서울카드선택풀림기다리기(): Promise<void> {
    await this.선택된서울카드.waitFor({ state: 'detached', timeout: 10000 }).catch(() => undefined);
  }
}
