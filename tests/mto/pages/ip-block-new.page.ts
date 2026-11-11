import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class IP규칙폼화면 {
  static readonly 주소 = '/admin/ip_blocks/new';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 아이피칸: Locator;
  readonly 만기: Locator;
  readonly 가입제한: Locator;
  readonly 가입차단: Locator;
  readonly 접근차단: Locator;
  readonly 주석: Locator;
  readonly 규칙만들기: Locator;
  readonly 잠금주의: Locator;
  readonly 오류요약: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '새 IP 규칙 만들기', level: 1 });
    this.알림 = new 알림(page);
    this.아이피칸 = page.getByRole('textbox', { name: 'IP' });
    this.만기 = page.getByRole('combobox', { name: '만기' });
    this.가입제한 = page.getByRole('radio', { name: /^가입 제한/ });
    this.가입차단 = page.getByRole('radio', { name: /^가입 차단/ });
    this.접근차단 = page.getByRole('radio', { name: /^접근 차단/ });
    this.주석 = page.getByRole('textbox', { name: '주석' });
    this.규칙만들기 = page.getByRole('button', { name: '규칙 만들기' });
    this.잠금주의 = page.getByText('자기 자신을 잠가버리지 않도록 주의하세요!');
    this.오류요약 = page.getByText('오류가 발생했습니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(IP규칙폼화면.주소);
    await this.제목.waitFor();
    await this.규칙만들기.waitFor();
  }

  async 만기기본값(): Promise<string> {
    return this.만기.evaluate((요소) => (요소 as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '');
  }

  async 만들기(아이피: string, 규칙?: '가입 제한' | '가입 차단' | '접근 차단'): Promise<void> {
    await this.아이피칸.fill(아이피);
    if (규칙 === '가입 제한') await this.가입제한.check();
    if (규칙 === '가입 차단') await this.가입차단.check();
    await this.규칙만들기.click();
    await this.page.waitForLoadState('load');
  }
}
