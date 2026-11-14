import type { Locator, Page } from '@playwright/test';

export class 이메일도메인차단화면 {
  static readonly 주소 = '/admin/email_domain_blocks/new';

  readonly 도메인칸: Locator;
  readonly 검사하기: Locator;
  readonly 차단하기: Locator;
  readonly 목록: Locator;

  constructor(private readonly page: Page) {
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.검사하기 = page.getByRole('button', { name: '도메인 검사' });
    this.차단하기 = page.getByRole('button', { name: '도메인 추가하기' });
    this.목록 = page.getByRole('table');
  }

  async 열기(): Promise<void> {
    await this.page.goto(이메일도메인차단화면.주소);
    await this.도메인칸.waitFor();
  }

  줄(도메인: string): Locator {
    return this.page.locator('.batch-table__row').filter({ hasText: 도메인 });
  }

  async 차단(도메인: string): Promise<void> {
    await this.도메인칸.fill(도메인);
    await this.검사하기.click();
    await this.차단하기.click();
    await this.줄(도메인).first().waitFor();
  }

  async 차단풀기(도메인: string): Promise<void> {
    await this.page.goto('/admin/email_domain_blocks');
    await this.줄(도메인).getByRole('checkbox').check();
    this.page.once('dialog', (대화) => void 대화.accept());
    await this.page.getByRole('button', { name: '삭제하기' }).click();
    await this.줄(도메인).waitFor({ state: 'detached' });
  }
}
