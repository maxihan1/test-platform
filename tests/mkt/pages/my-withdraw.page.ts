import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  constructor(private readonly page: Page) {}

  get 확인체크(): Locator {
    return this.page.getByRole('checkbox', { name: '위 내용을 확인했습니다' });
  }

  get 탈퇴버튼(): Locator {
    return this.page.getByRole('button', { name: '탈퇴하기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/withdraw');
    await this.탈퇴버튼.waitFor();
  }

  async 탈퇴하기를누르고확인창을받는다(): Promise<string> {
    const 문구 = new Promise<string>((해결) => {
      this.page.once('dialog', (창) => {
        const 내용 = 창.message();
        창.accept().then(() => 해결(내용), () => 해결(내용));
      });
    });
    await this.탈퇴버튼.click();
    return 문구;
  }
}
