import type { Locator, Page } from '@playwright/test';

export class 코디세이사람들목록 {
  readonly 제목: Locator;
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;
  readonly 검색결과없음안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '코디세이 사람들', level: 1, exact: true });
    this.검색어칸 = page.getByRole('textbox', { name: '검색어를 입력하세요.' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.검색결과없음안내 = page.getByText('등록된 코디세이 사람들이 없습니다.', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/board/promotion/list');
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }
}
