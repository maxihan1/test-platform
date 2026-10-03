import type { Locator, Page } from '@playwright/test';

export class 비밀번호찾기화면 {
  constructor(private readonly page: Page) {}

  get 아이디(): Locator {
    return this.page.getByLabel('아이디');
  }

  get 이메일(): Locator {
    return this.page.getByLabel('이메일');
  }

  get 제출버튼(): Locator {
    return this.page.getByRole('button', { name: '임시 비밀번호 받기' });
  }

  get 결과문구(): Locator {
    return this.page.getByRole('alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/find-password');
    await this.제출버튼.waitFor();
  }

  async 제출한다(아이디: string, 이메일: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.이메일.fill(이메일);
    await this.제출버튼.click();
    await this.제출버튼.waitFor();
  }
}
