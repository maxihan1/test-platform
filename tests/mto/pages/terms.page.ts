import type { Locator, Page } from '@playwright/test';

export class 이용약관화면 {
  static readonly 주소 = '/admin/terms_of_service';

  readonly 제목: Locator;
  readonly 현재탭: Locator;
  readonly 초안탭: Locator;
  readonly 역사탭: Locator;
  readonly 없음안내: Locator;
  readonly 직접사용: Locator;
  readonly 템플릿사용: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '이용 약관', level: 1 });
    this.현재탭 = page.getByRole('link', { name: '현재', exact: true });
    this.초안탭 = page.getByRole('link', { name: '초안', exact: true });
    this.역사탭 = page.getByRole('link', { name: '역사', exact: true });
    this.없음안내 = page.getByText('현재 설정된 이용약관이 없습니다.');
    this.직접사용 = page.getByRole('link', { name: '직접 사용' });
    this.템플릿사용 = page.getByRole('link', { name: '템플릿 사용' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(이용약관화면.주소);
    await this.제목.waitFor();
    await this.현재탭.waitFor();
  }

  async 템플릿사용누르기(): Promise<boolean> {
    return this.템플릿사용.click({ timeout: 10_000 }).then(
      () => true,
      () => false,
    );
  }
}
