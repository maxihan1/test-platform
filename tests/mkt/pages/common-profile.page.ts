import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  readonly 제목: Locator;
  readonly 재확인칸: Locator;
  readonly 재확인버튼: Locator;
  readonly 저장버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원정보 수정', level: 1 });
    this.재확인칸 = page.getByLabel('비밀번호', { exact: true });
    this.재확인버튼 = page.getByRole('button', { name: '비밀번호 확인', exact: true });
    this.저장버튼 = page.getByRole('button', { name: '저장', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/profile');
    await this.제목.waitFor();
  }

  async 재확인하기(비밀번호: string): Promise<void> {
    await this.재확인칸.fill(비밀번호);
    await this.재확인버튼.click();
    await this.저장버튼.waitFor();
  }

  async 화면의글들(): Promise<string> {
    const 본문 = await this.page.getByRole('main').innerText();
    const 칸값들 = await this.page.getByRole('main').locator('input, textarea').evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).value));
    return [본문, ...칸값들].join('\n');
  }
}
