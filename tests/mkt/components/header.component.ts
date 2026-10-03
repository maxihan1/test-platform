import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  constructor(private readonly page: Page) {}

  get 영역(): Locator {
    return this.page.getByRole('banner');
  }

  get 로고(): Locator {
    return this.영역.getByRole('link', { name: '데모마켓' });
  }

  get 햄버거(): Locator {
    return this.영역.getByRole('button', { name: '메뉴 열기' });
  }

  get 주메뉴(): Locator {
    return this.page.getByRole('navigation', { name: '주 메뉴' });
  }

  get 커뮤니티(): Locator {
    return this.주메뉴.getByRole('link', { name: '커뮤니티', exact: true });
  }

  하위메뉴(이름: string): Locator {
    return this.주메뉴.getByRole('menuitem', { name: 이름 });
  }

  get 쇼핑(): Locator {
    return this.주메뉴.getByRole('link', { name: '쇼핑', exact: true });
  }

  get 고객센터(): Locator {
    return this.주메뉴.getByRole('link', { name: '고객센터', exact: true });
  }

  get 로그인링크(): Locator {
    return this.영역.getByRole('link', { name: '로그인', exact: true });
  }

  get 회원가입링크(): Locator {
    return this.영역.getByRole('link', { name: '회원가입', exact: true });
  }

  get 이름(): Locator {
    return this.영역.locator('.hello');
  }

  get 알림종(): Locator {
    return this.영역.getByRole('button', { name: '알림' });
  }

  get 알림배지(): Locator {
    return this.영역.locator('.bell-count');
  }

  get 알림목록(): Locator {
    return this.영역.locator('.bell-list');
  }

  get 마이페이지(): Locator {
    return this.영역.getByRole('link', { name: '마이페이지', exact: true });
  }

  get 관리자링크(): Locator {
    return this.영역.getByRole('link', { name: '관리자', exact: true });
  }

  get 로그아웃(): Locator {
    return this.영역.getByRole('button', { name: '로그아웃', exact: true });
  }

  get 장바구니(): Locator {
    return this.영역.getByRole('link', { name: '장바구니' });
  }

  get 장바구니배지(): Locator {
    return this.영역.locator('.cart-count');
  }
}
