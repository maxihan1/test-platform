import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 웹훅폼화면 {
  static readonly 주소 = '/admin/webhooks/new';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 주소칸: Locator;
  readonly 템플릿칸: Locator;
  readonly 추가제출: Locator;
  readonly 오류안내: Locator;
  readonly 칸오류들: Locator;
  readonly 올바르지않은값: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '새 웹훅', level: 1 });
    this.알림 = new 알림(page);
    this.주소칸 = page.getByRole('textbox', { name: '엔드포인트 URL' });
    this.템플릿칸 = page.getByRole('textbox', { name: '페이로드 템플릿' });
    this.추가제출 = page.getByRole('button', { name: '엔드포인트 추가' });
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
    this.칸오류들 = page.locator('.error');
    this.올바르지않은값 = page.getByText('올바른 URL이 아닙니다');
  }

  이벤트(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(웹훅폼화면.주소);
    await this.주소칸.waitFor();
  }

  async 적기(주소: string, 이벤트들: string[], 템플릿?: string): Promise<void> {
    await this.주소칸.fill(주소);
    for (const 이름 of 이벤트들) await this.이벤트(이름).check();
    if (템플릿 !== undefined) await this.템플릿칸.fill(템플릿);
  }
}
