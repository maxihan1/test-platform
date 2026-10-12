import type { Locator, Page } from '@playwright/test';

export class 문의화면 {
  static readonly 주소 = '/support/inquiry';

  readonly 제목: Locator;
  readonly 유형: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 글자수: Locator;
  readonly 등록: Locator;
  readonly 내역: Locator;
  readonly 내역없음: Locator;
  readonly 알림: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '1:1 문의', level: 1 });
    this.유형 = page.getByLabel('유형', { exact: true });
    this.제목칸 = page.getByLabel('제목', { exact: true });
    this.내용칸 = page.getByLabel('내용', { exact: true });
    this.글자수 = page.getByText(/^\d+\/1000$/);
    this.등록 = page.getByRole('button', { name: '등록', exact: true });
    this.내역 = page.getByRole('region', { name: '내 문의 내역' });
    this.내역없음 = this.내역.getByText('문의 내역이 없습니다', { exact: true });
    this.알림 = page.getByRole('status');
  }

  async 열기(): Promise<void> {
    await this.page.goto(문의화면.주소);
  }

  async 글자수세기(칸: Locator): Promise<number> {
    return (await 칸.inputValue()).length;
  }

  알림글(문구: string): Locator {
    return this.알림.getByText(문구, { exact: true });
  }
}
