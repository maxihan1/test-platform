import type { Locator, Page } from '@playwright/test';

export class 오류화면 {
  readonly 제목: Locator;
  readonly 권한없음: Locator;
  readonly 없는페이지: Locator;
  readonly 홈으로: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.권한없음 = page.getByRole('heading', { name: '이 페이지를 표시할 권한이 없습니다.' });
    this.없는페이지 = page.getByRole('heading', { name: '찾으려는 페이지가 존재하지 않습니다.' });
    this.홈으로 = page.getByRole('link', { name: 'Go home' });
  }
}
