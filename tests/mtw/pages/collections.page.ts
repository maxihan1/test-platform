import type { Locator, Page } from '@playwright/test';

export class 컬렉션목록화면 {
  static readonly 주소 = '/@{아이디}/collections';

  readonly 제목: Locator;
  readonly 항목들: Locator;
  readonly 빈안내: Locator;
  readonly 새컬렉션: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.항목들 = page.getByRole('main').getByRole('article');
    this.빈안내 = page.getByText('아직 컬렉션을 만들지 않았습니다.');
    this.새컬렉션 = page.getByRole('main').getByRole('link', { name: '새 컬렉션' });
  }

  async 열기(아이디: string): Promise<void> {
    await this.page.goto(`/@${아이디}/collections`);
    await this.제목.waitFor();
  }

  async 링크그려질때까지(이름: string): Promise<void> {
    await this.링크(이름).waitFor();
  }

  링크(이름: string): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 이름, exact: true });
  }
}
