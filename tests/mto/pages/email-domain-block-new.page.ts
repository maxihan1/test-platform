import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 이메일도메인차단추가화면 {
  static readonly 주소 = '/admin/email_domain_blocks/new';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 도메인칸: Locator;
  readonly 승인허용: Locator;
  readonly 도메인검사: Locator;
  readonly 도메인추가하기: Locator;
  readonly 주요제공자주의: Locator;
  readonly 이미존재안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '새 이메일 도메인 차단', level: 1 });
    this.알림 = new 알림(page);
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.승인허용 = page.getByRole('checkbox', { name: '승인을 통한 가입 허용' });
    this.도메인검사 = page.getByRole('button', { name: '도메인 검사' });
    this.도메인추가하기 = page.getByRole('button', { name: '도메인 추가하기' });
    this.주요제공자주의 = page.getByText('주요 이메일 제공자를 차단하지 않도록 조심하세요.');
    this.이미존재안내 = page.getByText('이미 존재하는 값입니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(이메일도메인차단추가화면.주소);
    await this.제목.waitFor();
    await this.도메인검사.waitFor();
  }

  async 검사하기(도메인: string, 승인필요 = false): Promise<void> {
    await this.도메인칸.fill(도메인);
    if (승인필요) await this.승인허용.check();
    await this.도메인검사.click();
    await this.page.waitForLoadState('load');
    await this.도메인추가하기.waitFor();
  }

  async 추가하기(): Promise<void> {
    await this.도메인추가하기.click();
    await this.page.waitForLoadState('load');
  }
}
