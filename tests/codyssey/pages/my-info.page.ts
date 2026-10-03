import type { Locator, Page } from '@playwright/test';

import { 제목 } from '../components/title.component.js';

export class 내정보화면 {
  private readonly 제목부: 제목;

  constructor(private readonly page: Page) {
    this.제목부 = new 제목(page);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/main/myinfo/ams/list');
  }

  get 제목(): Locator {
    return this.제목부.대제목('내 정보');
  }

  항목(이름: string): Locator {
    return this.page.getByLabel(이름, { exact: true });
  }

  버튼(이름: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 이름, exact: true });
  }

  async 보이는항목(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.항목(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 보이는버튼(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.버튼(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 비밀번호변경을누른다(): Promise<void> {
    await this.버튼('비밀번호 변경').click();
  }

  get 비밀번호변경창(): Locator {
    return this.page.getByRole('dialog');
  }

  get 창제목(): Locator {
    return this.비밀번호변경창.getByRole('heading', { level: 2, name: '비밀번호 변경', exact: true });
  }

  창입력칸(이름: string): Locator {
    return this.비밀번호변경창.getByRole('textbox', { name: 이름, exact: true });
  }

  async 보이는창입력칸(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.창입력칸(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 취소하기를누른다(): Promise<void> {
    await this.비밀번호변경창.getByRole('button', { name: '취소하기', exact: true }).click();
  }
}
