import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  static readonly 주소 = '/my/withdraw';

  readonly 제목: Locator;
  readonly 안내제목: Locator;
  readonly 확인체크: Locator;
  readonly 탈퇴하기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원 탈퇴', level: 1 });
    this.안내제목 = page.getByRole('heading', { name: '탈퇴 전에 꼭 확인하세요', level: 2 });
    this.확인체크 = page.getByRole('checkbox', { name: '위 내용을 확인했습니다' });
    this.탈퇴하기 = page.getByRole('button', { name: '탈퇴하기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원탈퇴화면.주소);
  }
}
