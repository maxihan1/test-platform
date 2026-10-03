import type { Locator, Page } from '@playwright/test';

export class 주문내역화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/my/orders');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '주문 내역', level: 1, exact: true });
  }

  마이메뉴(): Locator {
    return this.page.getByRole('navigation', { name: '마이페이지 메뉴', exact: true });
  }

  메뉴링크(이름: string): Locator {
    return this.마이메뉴().getByRole('link', { name: 이름, exact: true });
  }

  현재메뉴(): Locator {
    return this.마이메뉴().locator('[aria-current="page"]');
  }

  기간버튼(이름: string): Locator {
    return this.page.getByRole('group', { name: '조회 기간', exact: true }).getByRole('button', { name: 이름, exact: true });
  }

  선택된기간버튼(이름: string): Locator {
    return this.page.getByRole('group', { name: '조회 기간', exact: true }).getByRole('button', { name: 이름, exact: true, pressed: true });
  }

  주문표(): Locator {
    return this.page.getByRole('table');
  }

  주문행들(): Locator {
    return this.주문표().getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  주문번호링크(주문번호: string): Locator {
    return this.주문표().getByRole('link', { name: 주문번호, exact: true });
  }

  상태글자(): Locator {
    return this.주문표().locator('.status');
  }

  async 주문번호누르기(주문번호: string): Promise<void> {
    await this.주문번호링크(주문번호).click();
  }

  async 줄별칸글자(): Promise<string[][]> {
    return this.주문행들().evaluateAll((줄들) =>
      줄들.map((줄) => Array.from(줄.querySelectorAll('td'), (칸) => (칸 as HTMLElement).innerText.trim())),
    );
  }

  async 상태별색(): Promise<{ 글자: string; 글자색: string; 배경색: string }[]> {
    return this.상태글자().evaluateAll((칸들) =>
      칸들.map((칸) => {
        const 스타일 = getComputedStyle(칸);
        return { 글자: (칸 as HTMLElement).innerText.trim(), 글자색: 스타일.color, 배경색: 스타일.backgroundColor };
      }),
    );
  }
}
