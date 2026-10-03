import type { Locator, Page } from '@playwright/test';

export class 바닥 {
  readonly 영역: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('contentinfo');
  }

  get 주소(): Locator {
    return this.영역.getByText('서울시 강남구 개포로 416 이노베이션아카데미');
  }

  get 문의메일링크(): Locator {
    return this.영역.getByRole('link', { name: 'qna@codyssey.kr' });
  }

  get 이용약관링크(): Locator {
    return this.영역.getByRole('link', { name: '이용약관' });
  }

  get 개인정보링크(): Locator {
    return this.영역.getByRole('link', { name: '개인정보처리방침' });
  }
}
