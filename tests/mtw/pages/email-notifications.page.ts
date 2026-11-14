import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 이메일알림화면 {
  static readonly 주소 = '/settings/preferences/notifications';

  readonly 틀: 설정틀;
  readonly 팔로우: Locator;
  readonly 팔로우요청: Locator;
  readonly 언급: Locator;
  readonly 인용: Locator;
  readonly 부스트: Locator;
  readonly 마음에듦: Locator;
  readonly 항상보내기: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.팔로우 = page.getByRole('checkbox', { name: '누군가 나를 팔로우 했을 때' });
    this.팔로우요청 = page.getByRole('checkbox', { name: '누군가 나를 팔로우 하길 요청할 때' });
    this.언급 = page.getByRole('checkbox', { name: '누군가 나를 언급했을 때' });
    this.인용 = page.getByRole('checkbox', { name: '누군가 나를 인용했을 때' });
    this.부스트 = page.getByRole('checkbox', { name: '누군가 내 게시물을 부스트 했을 때' });
    this.마음에듦 = page.getByRole('checkbox', { name: '누군가 내 상태를 마음에 들어했을 때' });
    this.항상보내기 = page.getByRole('checkbox', { name: '항상 이메일 알림 보내기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(이메일알림화면.주소);
    await this.틀.저장.waitFor();
    await this.팔로우.waitFor();
  }
}
