import type { Locator, Page } from '@playwright/test';

export class 상담 {
  constructor(private readonly page: Page) {}

  get 요소(): Locator {
    return this.page.locator('dm-chat');
  }

  get 버튼(): Locator {
    return this.page.getByRole('button', { name: '상담하기' });
  }

  get 창(): Locator {
    return this.page.getByRole('region', { name: '상담 창' });
  }

  get 입력(): Locator {
    return this.page.getByRole('textbox', { name: '상담 메시지' });
  }

  get 보내기(): Locator {
    return this.page.getByRole('button', { name: '보내기' });
  }

  get 닫기(): Locator {
    return this.page.getByRole('button', { name: '상담 창 닫기' });
  }
}
