import type { Locator, Page } from '@playwright/test';

export class 문의화면 {
  static readonly 주소 = '/support/inquiry';

  readonly 제목: Locator;
  readonly 유형: Locator;
  readonly 유형옵션: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 글자수: Locator;
  readonly 첨부칸: Locator;
  readonly 알림메일: Locator;
  readonly 등록: Locator;
  readonly 내역: Locator;
  readonly 내역행들: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '1:1 문의', level: 1 });
    this.유형 = page.getByLabel('유형', { exact: true });
    this.유형옵션 = this.유형.getByRole('option');
    this.제목칸 = page.getByLabel('제목', { exact: true });
    this.내용칸 = page.getByLabel('내용', { exact: true });
    this.글자수 = page.getByText(/^\d+\/1000$/);
    this.첨부칸 = page.getByLabel('첨부 파일 (1개, 10MB 이하)');
    this.알림메일 = page.getByRole('checkbox', { name: '답변 알림 이메일 받기' });
    this.등록 = page.getByRole('button', { name: '등록', exact: true });
    this.내역 = page.getByRole('region', { name: '내 문의 내역' });
    this.내역행들 = this.내역.getByRole('row').filter({ has: page.getByRole('cell') });
  }

  async 열기(): Promise<void> {
    await this.page.goto(문의화면.주소);
  }

  async 채우기(값: { 유형?: string; 제목?: string; 내용?: string }): Promise<void> {
    if (값.유형 !== undefined) await this.유형.selectOption(값.유형);
    if (값.제목 !== undefined) await this.제목칸.fill(값.제목);
    if (값.내용 !== undefined) await this.내용칸.fill(값.내용);
  }

  async 유형글들(): Promise<string[]> {
    return this.유형옵션.allInnerTexts();
  }

  async 선택된파일수(): Promise<number> {
    return this.첨부칸.evaluate((el) => (el as HTMLInputElement).files?.length ?? 0);
  }

  내역행(제목조각: string): Locator {
    return this.내역행들.filter({ hasText: 제목조각 });
  }

  async 제목글자수(): Promise<number> {
    return (await this.제목칸.inputValue()).length;
  }

  async 내용글자수(): Promise<number> {
    return (await this.내용칸.inputValue()).length;
  }

  async 글자수표시가아래인가(): Promise<boolean> {
    const 표시 = await this.글자수.boundingBox();
    const 칸 = await this.내용칸.boundingBox();
    return 표시 !== null && 칸 !== null && 표시.y >= 칸.y + 칸.height - 1;
  }
}
