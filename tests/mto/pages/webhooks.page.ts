import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 웹훅화면 {
  static readonly 주소 = '/admin/webhooks';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 엔드포인트추가: Locator;
  readonly 빈목록: Locator;
  readonly 웹훅줄들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '웹훅', level: 1 });
    this.알림 = new 알림(page);
    this.엔드포인트추가 = page.getByRole('link', { name: '엔드포인트 추가' });
    this.빈목록 = page.getByText('아직 설정한 웹훅 엔드포인트가 없습니다.');
    this.웹훅줄들 = page.locator('.applications-list__item');
  }

  async 열기(): Promise<void> {
    await this.page.goto(웹훅화면.주소);
    await this.제목.waitFor();
    await this.엔드포인트추가.waitFor();
  }

  웹훅줄(주소: string): Locator {
    return this.웹훅줄들.filter({ hasText: 주소 });
  }

  웹훅링크(주소: string): Locator {
    return this.page.getByRole('link', { name: 주소 });
  }

  활성화표시(주소: string): Locator {
    return this.웹훅줄(주소).getByText('활성화됨', { exact: true });
  }

  이벤트수안내(주소: string): Locator {
    return this.웹훅줄(주소).getByText('1개의 이벤트가 활성화되어 있습니다');
  }

  async 지우기(주소: string): Promise<void> {
    await this.열기();
    while ((await this.웹훅줄(주소).count()) > 0) {
      this.page.once('dialog', (창) => void 창.accept());
      await this.웹훅줄(주소).first().getByRole('link', { name: '삭제' }).click();
      await this.웹훅줄(주소).first().waitFor({ state: 'detached' });
      await this.열기();
    }
  }
}
