import type { Locator, Page } from '@playwright/test';

import { 머리 } from '../components/header.component.js';

export class 홈화면 {
  private readonly 머리부: 머리;

  constructor(private readonly page: Page) {
    this.머리부 = new 머리(page);
  }

  get 팝업(): Locator {
    return this.page.getByRole('dialog');
  }

  get 팝업닫기버튼(): Locator {
    return this.팝업.getByRole('button', { name: '닫기', exact: true });
  }

  get 교육과정신청버튼(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: '교육과정 신청하기', exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/');
    await this.머리부.메뉴('코디세이란').waitFor();
    await this.팝업이뜨면기다린다();
    await this.뜬팝업을닫는다();
  }

  async 팝업이뜨면기다린다(): Promise<void> {
    await this.팝업.first().waitFor({ timeout: 4000 }).catch((오류: unknown) => {
      if (오류 instanceof Error && 오류.name === 'TimeoutError') return;
      throw 오류;
    });
  }

  async 뜬팝업을닫는다(): Promise<void> {
    for (let 남은수 = await this.팝업닫기버튼.count(); 남은수 > 0; 남은수 = await this.팝업닫기버튼.count()) {
      await this.팝업닫기버튼.first().click();
      await this.팝업닫기버튼.nth(남은수 - 1).waitFor({ state: 'detached' });
    }
  }

  async 교육과정신청을누른다(): Promise<void> {
    await this.교육과정신청버튼.click();
  }

  async 보이는머리메뉴(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.머리부.메뉴(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 보이는지역링크(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.머리부.지역링크(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }
}
