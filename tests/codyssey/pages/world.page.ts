import type { Locator, Page } from '@playwright/test';

export class 세계관화면 {
  readonly 제목: Locator;
  readonly 스토리카드: Locator;
  readonly 소개영상플레이어: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '코디세이 세계관', level: 1 });
    this.스토리카드 = page.getByRole('img', { name: /^스토리라인 \d+$/ }).filter({ visible: true });
    this.소개영상플레이어 = page.getByLabel('코디세이 세계관 소개 영상 플레이어');
  }

  구역제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, level: 3, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/about/world');
  }
}
