import type { Locator, Page } from '@playwright/test';

export class 고객센터화면 {
  static readonly 주소 = '/support';

  readonly 제목: Locator;
  readonly 검색칸: Locator;
  readonly 탭들: Locator;
  readonly 검색없음문구: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '고객센터', level: 1 });
    this.검색칸 = page.getByRole('searchbox', { name: 'FAQ 검색' });
    this.탭들 = page.getByRole('tablist', { name: 'FAQ 분류' }).getByRole('tab');
    this.검색없음문구 = page.getByText('검색 결과가 없습니다', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(고객센터화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.page.getByRole('tabpanel').getByRole('listitem').first().or(this.검색없음문구).first().waitFor();
  }

  탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  선택된탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  질문(글: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 글, exact: true });
  }

  펼친질문(글: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 글, exact: true, expanded: true });
  }

  답변(글: string): Locator {
    return this.page.getByRole('listitem').filter({ has: this.page.getByRole('button', { name: 글, exact: true }) }).getByRole('region');
  }
}
