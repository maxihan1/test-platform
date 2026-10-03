import type { Locator, Page } from '@playwright/test';

export class 머리 {
  readonly 영역: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('banner');
  }

  메뉴(이름: string): Locator {
    return this.영역.getByRole('link', { name: 이름, exact: true });
  }

  async 메뉴에올린다(이름: string): Promise<void> {
    await this.메뉴(이름).hover();
  }

  async 메뉴를누른다(이름: string): Promise<void> {
    await this.메뉴(이름).click();
  }

  get 회원가입링크(): Locator {
    return this.영역.getByRole('link', { name: '회원가입', exact: true });
  }

  get 로그인링크(): Locator {
    return this.영역.getByRole('link', { name: '로그인', exact: true });
  }

  지역버튼(지역 = '서울'): Locator {
    return this.영역.getByRole('button', { name: 지역, exact: true });
  }

  지역링크(이름: string): Locator {
    return this.영역.getByRole('link', { name: 이름 });
  }
}
