import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  static readonly 주소 = '/';

  readonly 제목: Locator;
  readonly 공지창: Locator;
  readonly 공지닫기: Locator;
  readonly 이벤트띠: Locator;
  readonly 이벤트띠닫기: Locator;
  readonly 쿠키안내: Locator;
  readonly 쿠키동의: Locator;
  readonly 인기글탭: Locator;
  readonly 선택된인기글탭: Locator;
  readonly 최신글탭: Locator;
  readonly 최신글패널: Locator;
  readonly 글링크들: Locator;
  readonly 글항목들: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '데모마켓 홈', level: 1 });
    this.공지창 = page.getByRole('dialog', { name: '공지사항' });
    this.공지닫기 = this.공지창.getByText('닫기', { exact: true });
    this.이벤트띠 = page.getByRole('region', { name: '이벤트' });
    this.이벤트띠닫기 = this.이벤트띠.getByRole('button', { name: '닫기' });
    this.쿠키안내 = page.getByRole('region', { name: '쿠키 안내' });
    this.쿠키동의 = this.쿠키안내.getByRole('button', { name: '동의', exact: true });
    this.인기글탭 = page.getByRole('tab', { name: '인기글', exact: true });
    this.선택된인기글탭 = page.getByRole('tab', { name: '인기글', exact: true, selected: true });
    this.최신글탭 = page.getByRole('tab', { name: '최신글', exact: true });
    this.최신글패널 = page.getByRole('tabpanel', { name: '최신글', exact: true });
    this.글링크들 = page.getByRole('tabpanel').getByRole('link');
    this.글항목들 = page.getByRole('tabpanel').getByRole('listitem');
  }

  async 열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
  }

  async 글날짜들(): Promise<string[]> {
    return (await this.글항목들.allInnerTexts()).map((글) => /\d{4}-\d{2}-\d{2}/.exec(글)?.[0] ?? '');
  }
}
