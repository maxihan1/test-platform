import type { Locator, Page } from '@playwright/test';

export class 조치화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 경고보내기: Locator;
  readonly 동결: Locator;
  readonly 민감함: Locator;
  readonly 제한: Locator;
  readonly 정지: Locator;
  readonly 이메일알림: Locator;
  readonly 신고게시물포함: Locator;
  readonly 경고틀: Locator;
  readonly 커스텀경고: Locator;
  readonly 조치취하기: Locator;
  readonly 상태배너: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.경고보내기 = page.getByRole('radio', { name: /^경고 보내기/ });
    this.동결 = page.getByRole('radio', { name: /^동결/ });
    this.민감함 = page.getByRole('radio', { name: /^민감함/ });
    this.제한 = page.getByRole('radio', { name: /^제한/ });
    this.정지 = page.getByRole('radio', { name: /^정지/ });
    this.이메일알림 = page.getByRole('checkbox', { name: /이메일로 사용자에게 알리기/ });
    this.신고게시물포함 = page.getByRole('checkbox', { name: /신고된 게시물을 이메일에 포함/ });
    this.경고틀 = page.getByRole('combobox', { name: /경고 틀 사용하기/ });
    this.커스텀경고 = page.getByRole('textbox', { name: /커스텀 경고/ });
    this.조치취하기 = page.getByRole('button', { name: '조치 취하기' });
    this.상태배너 = page.locator('.flash-message, .simple_form .hint, .account-action__banner').filter({ hasText: '이 계정은 이미' });
  }

  async 열기(계정번호: string, 유형 = 'none'): Promise<number> {
    const 응답 = await this.page.goto(`${조치화면.주소}${계정번호}/action/new?type=${유형}`);
    await this.제목.waitFor();
    return 응답?.status() ?? 0;
  }

  async 그려질때까지(): Promise<void> {
    await this.조치취하기.waitFor();
  }

  유형(이름: '경고 보내기' | '동결' | '민감함' | '제한' | '정지'): Locator {
    return { '경고 보내기': this.경고보내기, 동결: this.동결, 민감함: this.민감함, 제한: this.제한, 정지: this.정지 }[이름];
  }

  async 조치하기(이름: '경고 보내기' | '동결' | '민감함' | '제한' | '정지', 메일알림 = false, 커스텀?: string): Promise<void> {
    await this.유형(이름).check();
    if ((await this.이메일알림.count()) > 0) await this.이메일알림.setChecked(메일알림);
    if (커스텀 !== undefined) await this.커스텀경고.fill(커스텀);
    await this.조치취하기.click();
    await this.page.waitForLoadState('load');
  }

  유형설명(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 경고틀항목글(): Promise<string[]> {
    return (await this.경고틀.getByRole('option').allTextContents()).map((글) => 글.trim()).filter((글) => 글 !== '');
  }

  async 제목글(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }

  async 경고틀본문앞부분(): Promise<string> {
    const 첫항목 = (await this.경고틀항목글())[0] ?? '';
    return 첫항목.slice(첫항목.indexOf(' - ') + 3).replace(/\.\.\.$/, '').trim();
  }

  async 경고틀로경고하기(항목: number, 커스텀: string): Promise<void> {
    await this.경고보내기.check();
    await this.경고틀.selectOption({ index: 항목 });
    if ((await this.이메일알림.count()) > 0) await this.이메일알림.setChecked(false);
    await this.커스텀경고.fill(커스텀);
    await this.조치취하기.click();
    await this.page.waitForLoadState('load');
  }
}
