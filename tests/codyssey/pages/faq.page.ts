import type { Locator, Page } from '@playwright/test';

export class FAQ목록 {
  readonly 제목: Locator;
  readonly 올인원탭: Locator;
  readonly 네이티브탭: Locator;
  readonly 카테고리선택상자: Locator;
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;
  readonly 검색결과없음안내: Locator;
  readonly 첫질문줄: Locator;
  readonly 첫질문답변: Locator;
  readonly 이전버튼: Locator;
  readonly 다음버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'FAQ', level: 1, exact: true });
    this.올인원탭 = page.getByRole('button', { name: 'AI 올인원', exact: true });
    this.네이티브탭 = page.getByRole('button', { name: 'AI 네이티브', exact: true });
    this.카테고리선택상자 = page.getByRole('combobox');
    this.검색어칸 = page.getByRole('textbox', { name: '검색어를 입력하세요.' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.검색결과없음안내 = page.getByText('검색 결과가 없습니다.', { exact: true });
    this.첫질문줄 = page.locator('li.post-item').first();
    this.첫질문답변 = this.첫질문줄.locator('.post-content');
    this.이전버튼 = page.getByRole('button', { name: '이전', exact: true });
    this.다음버튼 = page.getByRole('button', { name: '다음', exact: true });
  }

  선택지(글자: string): Locator {
    return this.카테고리선택상자.locator('option', { hasText: 글자 });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/board/faqGoList');
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }

  async 네이티브탭_누르기(): Promise<void> {
    await this.네이티브탭.click();
  }

  async 첫질문줄_누르기(): Promise<void> {
    await this.첫질문줄.getByRole('heading', { level: 3 }).click();
  }

  async 다음쪽으로_가기(): Promise<void> {
    await this.다음버튼.click();
  }
}
