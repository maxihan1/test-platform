import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  readonly 제목: Locator;
  readonly 확인체크: Locator;
  readonly 탈퇴하기버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원 탈퇴', level: 1 });
    this.확인체크 = page.getByRole('checkbox', { name: '위 내용을 확인했습니다', exact: true });
    this.탈퇴하기버튼 = page.getByRole('button', { name: '탈퇴하기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/withdraw');
    await this.제목.waitFor();
    await this.탈퇴하기버튼.waitFor();
  }
}
