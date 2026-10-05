import type { Locator, Page } from '@playwright/test';

export class 화면안확인 {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async 화면안에보인다(대상: Locator): Promise<boolean> {
    await 대상.waitFor();
    const 안에있다 = (): Promise<boolean> =>
      대상.evaluate((요소) => {
        const 위치 = 요소.getBoundingClientRect();
        return 위치.left >= 0 && 위치.right <= window.innerWidth;
      });
    for (let 번 = 0; 번 < 30; 번++) {
      if (await 안에있다()) return true;
      await this.page.waitForTimeout(100);
    }
    return 안에있다();
  }
}
