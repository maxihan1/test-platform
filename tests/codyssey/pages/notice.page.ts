import type { Locator, Page } from '@playwright/test';

export class 공지사항화면 {
  readonly 목록제목: Locator;
  readonly 검색어칸: Locator;
  readonly 등록일칸: Locator;
  readonly 검색버튼: Locator;
  readonly 첫글: Locator;
  readonly 검색결과없음안내: Locator;
  readonly 상세제목: Locator;
  readonly 목록버튼: Locator;

  constructor(private readonly page: Page) {
    this.목록제목 = page.getByRole('heading', { name: '공지사항', level: 1, exact: true });
    this.검색어칸 = page.getByRole('textbox', { name: '검색어를 입력하세요.' });
    this.등록일칸 = page.getByRole('textbox', { name: 'YYYY.MM.DD ~ YYYY.MM.DD' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.첫글 = page.locator('li.post-item').first();
    this.검색결과없음안내 = page.getByText('검색결과가 없습니다.', { exact: true });
    this.상세제목 = page.getByRole('heading', { name: '공지사항', level: 2, exact: true });
    this.목록버튼 = page.getByRole('button', { name: '목록', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/board/noticeGoList');
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }

  async 모든제목에_들어_있는가(글자: string): Promise<boolean> {
    return this.page
      .waitForFunction(
        (찾는글자) => {
          const 제목들 = Array.from(document.querySelectorAll('li.post-item h3'));
          return 제목들.length > 0 && 제목들.every((제목) => (제목.textContent ?? '').includes(찾는글자));
        },
        글자,
        { timeout: 10000 },
      )
      .then(() => true, () => false);
  }

  async 첫글열기(): Promise<void> {
    await this.첫글.getByRole('heading', { level: 3 }).click();
  }

  async 목록으로_가기(): Promise<void> {
    await this.목록버튼.click();
  }
}
