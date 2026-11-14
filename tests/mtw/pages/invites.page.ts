import type { Locator, Page } from '@playwright/test';

export class 초대화면 {
  static readonly 주소 = '/invites';

  readonly 만들기: Locator;
  readonly 링크칸들: Locator;

  constructor(private readonly page: Page) {
    this.만들기 = page.getByRole('button', { name: '초대 링크 생성하기' });
    this.링크칸들 = page.getByRole('table').getByRole('textbox');
  }

  async 열기(): Promise<void> {
    await this.page.goto(초대화면.주소);
    await this.만들기.waitFor();
  }

  async 주소들(): Promise<string[]> {
    return this.링크칸들.evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).value));
  }

  async 만들고새주소(): Promise<string> {
    const 전 = await this.주소들();
    await this.만들기.click();
    await this.링크칸들.nth(전.length).waitFor();
    const 후 = await this.주소들();
    const 새것 = 후.find((주소) => !전.includes(주소));
    if (새것 === undefined) throw new Error('새로 만든 초대 링크를 목록에서 찾지 못했다');
    return 새것;
  }

  async 비활성화(주소: string): Promise<void> {
    const 줄 = this.page.getByRole('row').filter({ has: this.page.locator(`input[value="${주소}"]`) });
    await 줄.getByRole('link', { name: '비활성화' }).click();
    await 줄.getByRole('cell', { name: '만료됨' }).waitFor();
  }
}
