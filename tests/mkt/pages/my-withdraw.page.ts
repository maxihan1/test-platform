import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  static readonly 주소 = '/my/withdraw';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 확인체크: Locator;
  readonly 탈퇴하기버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '회원 탈퇴', level: 1 });
    this.확인체크 = page.getByRole('checkbox', { name: '위 내용을 확인했습니다' });
    this.탈퇴하기버튼 = page.getByRole('button', { name: '탈퇴하기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원탈퇴화면.주소);
    await this.제목.waitFor();
  }
}
