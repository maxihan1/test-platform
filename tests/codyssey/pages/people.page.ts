import type { Locator, Page } from '@playwright/test';

import { 머리 } from '../components/header.component.js';

export class 코디세이사람들화면 {
  private readonly 머리부: 머리;

  constructor(private readonly page: Page) {
    this.머리부 = new 머리(page);
  }

  private get 본문(): Locator {
    return this.page.getByRole('main');
  }

  get 검색어칸(): Locator {
    return this.page.getByPlaceholder('검색어를 입력하세요.');
  }

  get 검색버튼(): Locator {
    return this.본문.getByRole('button', { name: '검색', exact: true });
  }

  get 이전버튼(): Locator {
    return this.본문.getByRole('button', { name: '이전', exact: true });
  }

  get 다음버튼(): Locator {
    return this.본문.getByRole('button', { name: '다음', exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/board/promotion/list');
    await this.머리부.메뉴('알림마당').waitFor();
  }
}
