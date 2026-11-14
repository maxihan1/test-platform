import type { Locator, Page } from '@playwright/test';

export class 리스트화면 {
  static readonly 주소 = '/lists';

  readonly 제목: Locator;
  readonly 만들기링크: Locator;
  readonly 항목들: Locator;
  readonly 빈안내: Locator;
  readonly 만들기권유: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '리스트', level: 1 });
    this.만들기링크 = page.getByRole('main').getByRole('link', { name: '리스트 만들기' });
    this.항목들 = page.getByRole('main').getByRole('article');
    this.빈안내 = page.getByText('아직 아무 리스트도 없습니다.');
    this.만들기권유 = page.getByText('새 리스트를 만들어 홈 피드를 정리하세요');
  }

  async 열기(): Promise<void> {
    await this.page.goto(리스트화면.주소);
    await this.제목.waitFor();
  }

  항목(이름: string): Locator {
    return this.항목들.filter({ hasText: 이름 });
  }

  항목링크(이름: string): Locator {
    return this.항목(이름).getByRole('link', { name: 이름, exact: true });
  }
}
