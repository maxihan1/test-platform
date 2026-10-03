import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/my/withdraw');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '회원 탈퇴', level: 1, exact: true });
  }

  확인체크(): Locator {
    return this.page.getByRole('checkbox', { name: '위 내용을 확인했습니다', exact: true });
  }

  탈퇴버튼(): Locator {
    return this.page.getByRole('button', { name: '탈퇴하기', exact: true });
  }
}
