import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 경고프리셋화면 {
  static readonly 주소 = '/admin/warning_presets';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 제목칸: Locator;
  readonly 본문칸: Locator;
  readonly 새로추가: Locator;
  readonly 프리셋줄들: Locator;
  readonly 빈목록: Locator;
  readonly 오류안내: Locator;
  readonly 칸오류들: Locator;
  readonly 보안오류: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '경고 프리셋', level: 1 });
    this.알림 = new 알림(page);
    this.제목칸 = page.getByRole('textbox', { name: '제목' });
    this.본문칸 = page.getByRole('textbox', { name: '프리셋 텍스트' });
    this.새로추가 = page.getByRole('button', { name: '새로 추가' });
    this.프리셋줄들 = page.locator('.announcements-list__item');
    this.빈목록 = page.getByText('아직 어떤 경고 틀도 정의되지 않았습니다.');
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
    this.칸오류들 = page.locator('.error');
    this.보안오류 = page.getByText('보안 검증에 실패했습니다. 쿠키를 차단했나요?');
  }

  async 열기(): Promise<void> {
    await this.page.goto(경고프리셋화면.주소);
    await this.제목.waitFor();
    await this.새로추가.waitFor();
  }

  프리셋줄(제목: string): Locator {
    return this.프리셋줄들.filter({ hasText: 제목 });
  }

  프리셋링크(제목: string): Locator {
    return this.page.getByRole('link', { name: 제목, exact: true });
  }

  async 적기(제목: string, 본문: string): Promise<void> {
    await this.제목칸.fill(제목);
    await this.본문칸.fill(본문);
  }

  async 보안토큰바꾸기(): Promise<void> {
    await this.page.locator('input[name="authenticity_token"]').first().evaluate((칸) => {
      (칸 as HTMLInputElement).value = 'mto-bad-token';
    });
  }

  async 새로추가하고기다리기(): Promise<void> {
    await this.새로추가.click();
    await this.page.waitForLoadState('load');
  }

  async 프리셋지우기(제목: string): Promise<void> {
    await this.열기();
    const 줄 = this.프리셋줄(제목);
    if ((await 줄.count()) === 0) return;
    this.page.once('dialog', (창) => void 창.accept());
    await 줄.first().getByRole('link', { name: '삭제' }).click();
    await this.프리셋줄(제목).first().waitFor({ state: 'detached' });
  }
}
