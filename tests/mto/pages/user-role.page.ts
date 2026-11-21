import type { Locator, Page } from '@playwright/test';

export class 역할변경화면 {
  static readonly 주소 = '/admin/users/';

  readonly 제목: Locator;
  readonly 역할선택: Locator;
  readonly 역할관리링크: Locator;
  readonly 사용자역할관리링크: Locator;
  readonly 저장: Locator;
  readonly 우선순위초과오류: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.역할선택 = page.getByRole('combobox').first();
    this.역할관리링크 = page.getByRole('link', { name: '역할 관리' });
    this.사용자역할관리링크 = page.getByRole('link', { name: '사용자 역할 관리', exact: true });
    this.저장 = page.getByRole('button', { name: '변경 사항을 저장' });
    this.우선순위초과오류 = page.getByText('당신의 현재 역할보다 높을 수 없습니다').first();
  }

  async 그려질때까지(): Promise<void> {
    await this.저장.waitFor();
  }

  async 역할바꾸기(역할: string): Promise<void> {
    await this.역할선택.selectOption({ label: 역할 });
    await this.저장.click();
    await this.page.waitForLoadState('load');
  }

  async 첫항목글(): Promise<string> {
    return ((await this.역할선택.getByRole('option').first().textContent()) ?? '').trim();
  }

  async 제목글(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }
}
