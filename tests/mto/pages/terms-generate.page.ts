import type { Locator, Page } from '@playwright/test';

export class 이용약관설정화면 {
  static readonly 주소 = '/admin/terms_of_service/generate';

  readonly 제목: Locator;
  readonly 자동게시안내: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: '이용 약관 설정', level: 1 });
    this.자동게시안내 = page.getByText('생성된 이용 약관은 자동으로 게시되지 않을 것입니다.');
  }
}
