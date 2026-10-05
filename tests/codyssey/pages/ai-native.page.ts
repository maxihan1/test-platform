import type { Locator, Page } from '@playwright/test';

export class AI네이티브화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 공고문바로보기버튼: Locator;
  readonly 공고문다운로드버튼: Locator;
  readonly FAQ버튼: Locator;
  readonly FAQ제목: Locator;
  readonly FAQ검색칸: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: 'AI 네이티브', level: 1, exact: true });
    this.공고문바로보기버튼 = page.getByRole('main').getByRole('button', { name: '공고문 바로보기', exact: true });
    this.공고문다운로드버튼 = page.getByRole('main').getByRole('button', { name: '공고문 다운로드', exact: true });
    this.FAQ버튼 = page.getByRole('main').getByRole('button', { name: 'FAQ', exact: true });
    this.FAQ제목 = page.getByRole('main').getByRole('heading', { name: 'FAQ', level: 1, exact: true });
    this.FAQ검색칸 = page.getByPlaceholder('검색어를 입력하세요.');
  }

  async 연다(): Promise<void> {
    await this.page.goto('/guide/aiNative');
  }

  async FAQ를누른다(): Promise<void> {
    await this.FAQ버튼.click();
  }

  async 공고문바로보기를누른다(): Promise<string> {
    const 맥락 = this.page.context();
    const [새탭, 새탭요청] = await Promise.all([
      맥락.waitForEvent('page'),
      맥락.waitForEvent('request', (요청) => 요청.isNavigationRequest() && 요청.url() !== this.page.url()),
      this.공고문바로보기버튼.click(),
    ]);
    await 새탭.close();
    return 새탭요청.url();
  }
}
