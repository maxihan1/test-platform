import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 전부: Locator;

  constructor(page: Page) {
    this.상자 = page.locator('#toast-box');
    this.전부 = this.상자.locator('.toast');
  }

  문구(글: string): Locator {
    return this.전부.filter({ hasText: 글 });
  }

  async 기다리기(글: string): Promise<Locator> {
    const 그것 = this.문구(글).first();
    await 그것.waitFor();
    return 그것;
  }
}

export class 모달 {
  readonly 창: Locator;
  readonly 바깥: Locator;
  readonly 닫기X: Locator;

  constructor(private readonly page: Page) {
    this.창 = page.locator('.modal-backdrop .modal[role=dialog]');
    this.바깥 = page.locator('.modal-backdrop');
    this.닫기X = this.창.getByRole('button', { name: '닫기', exact: true }).and(page.locator('.modal-x'));
  }

  버튼(이름: string): Locator {
    return this.창.locator('.modal-foot').getByRole('button', { name: 이름, exact: true });
  }

  async 열림기다리기(): Promise<void> {
    await this.page.locator('.modal-backdrop.open').waitFor();
  }

  async 닫힘기다리기(): Promise<void> {
    await this.바깥.waitFor({ state: 'detached' });
  }

  async 바깥누르기(): Promise<void> {
    const 상자 = await this.바깥.boundingBox();
    if (!상자) throw new Error('모달 바깥 영역이 보이지 않는다');
    await this.page.mouse.click(상자.x + 5, 상자.y + 5);
  }
}
