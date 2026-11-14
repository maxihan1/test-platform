import type { Locator, Page } from '@playwright/test';

export type 책자필터 = '최근 활동' | '새로운 사람들' | 'mastodon.maxihan.com에서만' | '알려진 연합우주로부터';

const 필터질의: Record<책자필터, string> = {
  '최근 활동': 'order=active',
  '새로운 사람들': 'order=new',
  'mastodon.maxihan.com에서만': 'local=true',
  '알려진 연합우주로부터': 'local=false',
};

export class 프로필책자화면 {
  static readonly 주소 = '/directory';

  readonly 영역: Locator;

  constructor(private readonly page: Page) {
    this.영역 = page.getByRole('main').getByRole('region', { name: '프로필 둘러보기' });
  }

  필터(이름: 책자필터): Locator {
    return this.영역.getByText(이름, { exact: true });
  }

  계정카드(아이디: string): Locator {
    return this.영역.getByRole('link', { name: new RegExp(`@${아이디}$`) });
  }

  async 열기(): Promise<void> {
    await this.page.goto(프로필책자화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.필터('최근 활동').waitFor();
    await this.영역.getByRole('link', { name: /@/ }).first().waitFor();
  }

  async 필터누르기(이름: 책자필터): Promise<void> {
    const 질의 = 필터질의[이름];
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/v1/directory') && r.url().includes(질의));
    await this.필터(이름).click();
    await 응답;
  }
}
