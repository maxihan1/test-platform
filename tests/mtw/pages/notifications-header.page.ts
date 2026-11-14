import type { Locator, Page } from '@playwright/test';

import { 대화창 } from '../components/dialog.component.js';
import { 알림막대 } from '../components/toast.component.js';

export class 알림머리말화면 {
  static readonly 주소 = '/notifications';

  readonly 창: 대화창;
  readonly 알림: 알림막대;
  readonly 제목: Locator;
  readonly 설정버튼: Locator;
  readonly 걸러진알림: Locator;
  readonly 모두읽음: Locator;
  readonly 영역: Locator;
  readonly 알림비우기: Locator;
  readonly 글목록: Locator;

  constructor(private readonly page: Page) {
    this.창 = new 대화창(page);
    this.알림 = new 알림막대(page);
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.설정버튼 = page.getByRole('main').getByRole('button', { name: '설정 보이기' });
    this.걸러진알림 = page.getByRole('main').getByRole('link', { name: /걸러진 알림/ }).or(page.getByRole('main').getByRole('button', { name: /걸러진 알림/ }));
    this.모두읽음 = page.getByRole('main').getByRole('button', { name: '모든 알림을 읽은 상태로 표시' });
    this.영역 = page.getByRole('region', { name: '알림' });
    this.알림비우기 = page.getByRole('main').getByRole('button', { name: '알림 비우기' });
    this.글목록 = this.영역.getByRole('article');
  }

  async 열기(): Promise<void> {
    await this.page.goto(알림머리말화면.주소);
    await this.제목.waitFor();
  }

  빠른필터(이름: string): Locator {
    return this.영역.getByRole('button', { name: 이름, exact: true });
  }

  안내(문구: string | RegExp): Locator {
    return this.영역.getByText(문구);
  }

  async 설정열기(): Promise<void> {
    await this.설정버튼.click();
    await this.알림비우기.waitFor();
  }
}
