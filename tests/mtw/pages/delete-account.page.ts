import type { Locator, Page } from '@playwright/test';

export class 계정삭제화면 {
  static readonly 주소 = '/settings/delete';

  readonly 사용자명표시: Locator;
  readonly 사용자명칸: Locator;
  readonly 암호칸: Locator;
  readonly 삭제버튼: Locator;
  readonly 오류안내: Locator;

  constructor(private readonly page: Page) {
    this.사용자명표시 = page.getByRole('code');
    this.사용자명칸 = page.getByRole('textbox', { name: 'Confirm username' });
    this.암호칸 = page.getByRole('textbox', { name: '암호' });
    this.삭제버튼 = page.getByRole('button', { name: '계정 삭제' });
    this.오류안내 = page.getByText('입력한 정보가 올바르지 않습니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(계정삭제화면.주소);
    await this.삭제버튼.waitFor();
  }

  async 틀린암호로삭제누르기(암호: string): Promise<void> {
    const 사용자명 = (await this.사용자명표시.first().innerText()).trim();
    await this.사용자명칸.fill(사용자명);
    await this.암호칸.fill(암호);
    await this.삭제버튼.click();
  }
}
