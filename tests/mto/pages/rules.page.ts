import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 서버규칙화면 {
  static readonly 주소 = '/admin/rules';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 규칙추가: Locator;
  readonly 추가제출: Locator;
  readonly 빈목록: Locator;
  readonly 규칙칸: Locator;
  readonly 추가정보칸: Locator;
  readonly 규칙줄들: Locator;
  readonly 오류안내: Locator;
  readonly 칸오류들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '서버 규칙', level: 1 });
    this.알림 = new 알림(page);
    this.규칙추가 = page.getByRole('link', { name: '규칙 추가' }).or(page.getByRole('button', { name: '규칙 추가' })).first();
    this.추가제출 = page.getByRole('button', { name: '규칙 추가' });
    this.빈목록 = page.getByText('아직 정의된 서버 규칙이 없습니다.');
    this.규칙칸 = page.locator('#rule_text');
    this.추가정보칸 = page.locator('#rule_hint');
    this.규칙줄들 = page.locator('.announcements-list__item, .rules-list__item');
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
    this.칸오류들 = page.locator('.error');
  }

  async 열기(): Promise<void> {
    await this.page.goto(서버규칙화면.주소);
    await this.제목.waitFor();
  }

  규칙줄(글: string): Locator {
    return this.규칙줄들.filter({ hasText: 글 });
  }

  위로이동(글: string): Locator {
    return this.규칙줄(글).getByRole('link', { name: '위로 이동' });
  }

  아래로이동(글: string): Locator {
    return this.규칙줄(글).getByRole('link', { name: '아래로 이동' });
  }

  삭제링크(글: string): Locator {
    return this.규칙줄(글).getByRole('link', { name: '삭제' });
  }

  async 첫줄이될때까지(머리글: string, 글: string): Promise<void> {
    await this.규칙줄(머리글).first().filter({ hasText: 글 }).waitFor();
  }

  async 줄글들(머리글: string): Promise<string[]> {
    const 글들 = await this.규칙줄(머리글).locator('.announcements-list__item__title').allInnerTexts();
    return 글들.map((글) => 글.replace(/\s+/g, ' ').trim());
  }

  async 수정열기(글: string): Promise<void> {
    await this.규칙줄(글).first().locator('.announcements-list__item__title').click();
  }

  async 추가폼열기(): Promise<void> {
    await this.page.goto('/admin/rules/new');
    await this.규칙칸.waitFor();
  }

  async 규칙적고추가누르기(글: string): Promise<void> {
    await this.규칙칸.fill(글);
    await this.추가제출.click();
  }

  async 규칙더하기(글: string): Promise<void> {
    await this.page.goto('/admin/rules/new');
    await this.규칙칸.fill(글);
    await this.page.getByRole('button', { name: /규칙 추가|저장/ }).first().click();
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }

  async 규칙지우기(글: string): Promise<void> {
    await this.열기();
    const 줄 = this.규칙줄(글);
    if ((await 줄.count()) === 0) return;
    this.page.once('dialog', (창) => void 창.accept());
    await 줄.first().getByRole('link', { name: '삭제' }).click();
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }
}
