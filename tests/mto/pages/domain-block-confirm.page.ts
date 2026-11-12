import type { Locator, Page } from '@playwright/test';

export class 도메인차단확인화면 {
  static readonly 주소 = '/admin/domain_blocks';

  readonly 교신중지안내: Locator;
  readonly 정지: Locator;
  readonly 취소: Locator;

  constructor(private readonly page: Page) {
    this.교신중지안내 = page.getByText('이 서버들과의 교신이 중지될 것입니다');
    this.정지 = page.getByRole('button', { name: '정지', exact: true });
    this.취소 = page.getByRole('link', { name: '취소' });
  }

  제목(도메인: string): Locator {
    return this.page.getByRole('heading', { name: `${도메인} 도메인 차단 확인`, level: 1 });
  }
}
