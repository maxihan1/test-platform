import type { Locator, Page } from '@playwright/test';

export class 없는주소화면 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' });
  }

  get 안내문구(): Locator {
    return this.page.getByText('주소가 바뀌었거나 삭제된 페이지입니다.');
  }

  get 홈으로(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: '홈으로' });
  }

  async 열기(경로 = '/mkt-no-such-page'): Promise<void> {
    await this.page.goto(경로);
    await this.제목.waitFor();
  }
}
