import type { Locator, Page } from '@playwright/test';

export class 문의화면 {
  static readonly 주소 = '/support/inquiry';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 유형: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 첨부칸: Locator;
  readonly 이메일알림: Locator;
  readonly 등록버튼: Locator;
  readonly 글자수: Locator;
  readonly 내역제목: Locator;
  readonly 내역: Locator;
  readonly 내역줄들: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '1:1 문의', level: 1 });
    this.유형 = page.getByLabel('유형');
    this.제목칸 = page.getByLabel('제목');
    this.내용칸 = page.getByLabel('내용');
    this.첨부칸 = page.getByLabel('첨부 파일');
    this.이메일알림 = page.getByRole('checkbox', { name: '답변 알림 이메일 받기' });
    this.등록버튼 = page.getByRole('button', { name: '등록', exact: true });
    this.글자수 = page.getByText(/^\d+\/1000$/);
    this.내역제목 = page.getByRole('heading', { name: '내 문의 내역' });
    this.내역 = page.locator('#history');
    this.내역줄들 = this.내역.locator('tbody').getByRole('row');
  }

  async 열기(): Promise<void> {
    await this.page.goto(문의화면.주소);
    await this.등록버튼.waitFor();
    await this.내역.locator('table, .empty-state').first().waitFor();
  }

  async 채우기(내용: { 유형?: string; 제목?: string; 내용?: string }): Promise<void> {
    if (내용.유형 !== undefined) await this.유형.selectOption(내용.유형);
    if (내용.제목 !== undefined) await this.제목칸.fill(내용.제목);
    if (내용.내용 !== undefined) await this.내용칸.fill(내용.내용);
  }

  async 등록하고응답기다리기(): Promise<number> {
    const 응답 = this.page.waitForResponse((r) => r.url().endsWith('/api/inquiries') && r.request().method() === 'POST');
    await this.등록버튼.click();
    return (await 응답).status();
  }

  async 고른파일이름들(): Promise<string[]> {
    return this.첨부칸.evaluate((칸) => Array.from((칸 as HTMLInputElement).files ?? []).map((파일) => 파일.name));
  }

  async 내역이폼아래에있는가(): Promise<boolean> {
    const 폼 = await this.등록버튼.boundingBox();
    const 내역 = await this.내역제목.boundingBox();
    if (폼 === null || 내역 === null) return false;
    return 내역.y >= 폼.y + 폼.height - 1;
  }

  async 글자수가내용칸아래에있는가(): Promise<boolean> {
    const 칸 = await this.내용칸.boundingBox();
    const 수 = await this.글자수.boundingBox();
    if (칸 === null || 수 === null) return false;
    return 수.y >= 칸.y + 칸.height - 1;
  }

  async 내역첫줄(): Promise<{ 제목: string; 상태: string }> {
    const 칸들 = await this.내역줄들.first().getByRole('cell').allInnerTexts();
    return { 제목: 칸들[1] ?? '', 상태: 칸들[3] ?? '' };
  }
}
