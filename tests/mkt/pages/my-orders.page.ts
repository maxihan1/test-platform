import type { Locator, Page } from '@playwright/test';

export interface 주문줄 {
  날짜: string;
  주문번호: string;
  칸수: number;
}

export interface 상태색 {
  상태: string;
  색: string;
}

export class 주문내역화면 {
  constructor(private readonly page: Page) {}

  get 메뉴묶음(): Locator {
    return this.page.getByRole('navigation', { name: '마이페이지 메뉴' });
  }

  메뉴(이름: string): Locator {
    return this.메뉴묶음.getByRole('link', { name: 이름, exact: true });
  }

  get 메뉴링크들(): Locator {
    return this.메뉴묶음.getByRole('link');
  }

  기간버튼(이름: string): Locator {
    return this.page.getByRole('button', { name: 이름, exact: true });
  }

  get 줄들(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('link') });
  }

  get 불러오는중(): Locator {
    return this.page.getByLabel('불러오는 중');
  }

  get 상태글자들(): Locator {
    return this.page.locator('.status');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/orders');
    await this.줄들.first().waitFor();
  }

  async 기간을누른다(이름: string): Promise<void> {
    await this.기간버튼(이름).click();
    await this.불러오는중.waitFor({ state: 'detached' });
    await this.줄들.first().waitFor();
  }

  async 줄정보(): Promise<주문줄[]> {
    return this.줄들.evaluateAll((줄들) =>
      줄들.map((줄) => ({
        날짜: 줄.querySelectorAll('td')[0]?.textContent ?? '',
        주문번호: 줄.querySelectorAll('td')[1]?.textContent ?? '',
        칸수: 줄.querySelectorAll('td').length,
      })),
    );
  }

  async 칸채움(): Promise<boolean[]> {
    return this.줄들.evaluateAll((줄들) =>
      줄들.map((줄) => [...줄.querySelectorAll('td')].every((칸) => (칸.textContent ?? '').trim() !== '')),
    );
  }

  async 상태색들(): Promise<상태색[]> {
    return this.상태글자들.evaluateAll((글자들) =>
      글자들.map((글자) => ({ 상태: 글자.textContent ?? '', 색: getComputedStyle(글자).color })),
    );
  }

  주문번호링크(번호: string): Locator {
    return this.page.getByRole('link', { name: 번호, exact: true });
  }

  get 첫줄링크(): Locator {
    return this.줄들.first().getByRole('link');
  }
}
