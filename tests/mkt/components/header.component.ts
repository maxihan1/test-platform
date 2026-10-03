import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  constructor(private readonly page: Page) {}

  영역(): Locator {
    return this.page.getByRole('banner');
  }

  로고(): Locator {
    return this.영역().getByRole('link', { name: '데모마켓', exact: true });
  }

  주메뉴(): Locator {
    return this.영역().getByRole('navigation', { name: '주 메뉴' });
  }

  메뉴링크(이름: string): Locator {
    return this.주메뉴().getByRole('link', { name: 이름, exact: true });
  }

  하위메뉴(이름: string): Locator {
    return this.주메뉴().getByRole('menuitem', { name: 이름, exact: true });
  }

  로그인링크(): Locator {
    return this.영역().getByRole('link', { name: '로그인', exact: true });
  }

  회원가입링크(): Locator {
    return this.영역().getByRole('link', { name: '회원가입', exact: true });
  }

  이름표시(): Locator {
    return this.영역().getByText(/님$/);
  }

  마이페이지링크(): Locator {
    return this.영역().getByRole('link', { name: '마이페이지', exact: true });
  }

  관리자링크(): Locator {
    return this.영역().getByRole('link', { name: '관리자', exact: true });
  }

  로그아웃버튼(): Locator {
    return this.영역().getByRole('button', { name: '로그아웃', exact: true });
  }

  알림종(): Locator {
    return this.영역().getByRole('button', { name: '알림', exact: true });
  }

  장바구니링크(): Locator {
    return this.영역().getByRole('link', { name: '장바구니', exact: true });
  }

  장바구니배지(): Locator {
    return this.장바구니링크().locator('.cart-count');
  }

  햄버거버튼(): Locator {
    return this.영역().getByRole('button', { name: '메뉴 열기', exact: true });
  }
}
