import type { Locator, Page } from '@playwright/test';

export class 좋아요한사람화면 {
  static readonly 주소 = '/@{아이디}/{글번호}/favourites';

  readonly 영역: Locator;

  constructor(private readonly page: Page) {
    this.영역 = page.getByRole('main').getByRole('region');
  }

  안내(문구: string): Locator {
    return this.영역.getByText(문구);
  }

  async 열기(글경로: string): Promise<void> {
    await this.page.goto(`${글경로}/favourites`);
    await this.page.getByRole('main').getByRole('button', { name: '돌아가기' }).waitFor();
  }
}
