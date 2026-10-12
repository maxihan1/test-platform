import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  static readonly 주소 = '/my/profile';

  readonly 제목: Locator;
  readonly 안내: Locator;
  readonly 비밀번호: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원정보 수정', level: 1 });
    this.안내 = page.getByText('회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.', { exact: true });
    this.비밀번호 = page.getByLabel('비밀번호', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원정보수정화면.주소);
  }
}
