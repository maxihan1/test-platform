import type { Locator, Page } from '@playwright/test';

import { 오류화면 } from '../components/error-page.component.js';
import { 알림 } from '../components/flash.component.js';
import { 사이드바 } from '../components/sidebar.component.js';

export class 관리화면 {
  static readonly 주소 = '/admin/dashboard';

  readonly 제목: Locator;
  readonly 사이드바: 사이드바;
  readonly 알림: 알림;
  readonly 오류: 오류화면;
  readonly 사이드바링크들: Locator;
  readonly 사이드바맨위항목: Locator;
  readonly 서버오류안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.사이드바 = new 사이드바(page);
    this.알림 = new 알림(page);
    this.오류 = new 오류화면(page);
    this.사이드바링크들 = this.사이드바.영역.getByRole('link');
    this.사이드바맨위항목 = this.사이드바.영역.getByRole('listitem').first().getByRole('link');
    this.서버오류안내 = page.getByText('죄송합니다, 뭔가 잘못 되었습니다.');
  }

  async 열기(경로: string): Promise<number> {
    const 응답 = await this.page.goto(경로);
    await this.제목.waitFor();
    return 응답?.status() ?? 0;
  }

  async 열어서응답코드(경로: string): Promise<number> {
    const 응답 = await this.page.goto(경로);
    await this.오류.없는페이지.or(this.제목).first().waitFor();
    return 응답?.status() ?? 0;
  }

  async 제목글(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }

  제목이(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, exact: true, level: 1 });
  }

  묶음메뉴들(묶음이름: string): Locator {
    return this.사이드바.영역
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('link', { name: 묶음이름, exact: true }) })
      .getByRole('list')
      .getByRole('link');
  }

  묶음메뉴(묶음이름: string, 이름: string): Locator {
    return this.묶음메뉴들(묶음이름).filter({ hasText: new RegExp(`^\\s*${이름}\\s*$`) });
  }

  async 누르기(링크: Locator): Promise<void> {
    const 다시그려짐 = this.page.waitForEvent('load');
    await 링크.click();
    await 다시그려짐;
  }
}
