import type { Locator, Page } from '@playwright/test';

export class 비밀번호찾기화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/find-password');
  }

  아이디칸(): Locator {
    return this.page.getByLabel('아이디', { exact: true });
  }

  이메일칸(): Locator {
    return this.page.getByLabel('이메일', { exact: true });
  }

  임시비밀번호받기버튼(): Locator {
    return this.page.getByRole('button', { name: '임시 비밀번호 받기', exact: true });
  }

  결과문구(): Locator {
    return this.page.getByRole('alert');
  }

  async 찾기(아이디: string, 이메일: string): Promise<void> {
    await this.아이디칸().fill(아이디);
    await this.이메일칸().fill(이메일);
    await this.임시비밀번호받기버튼().click();
  }
}
