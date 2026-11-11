import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 공지사항폼화면 {
  static readonly 주소 = '/admin/announcements/new';

  readonly 제목: Locator;
  readonly 새폼제목: Locator;
  readonly 알림: 알림;
  readonly 이벤트시작: Locator;
  readonly 이벤트종료: Locator;
  readonly 종일일정: Locator;
  readonly 본문칸: Locator;
  readonly 발행일정: Locator;
  readonly 생성: Locator;
  readonly 저장: Locator;
  readonly 오류안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.새폼제목 = page.getByRole('heading', { name: '새 공지사항', level: 1 });
    this.알림 = new 알림(page);
    this.이벤트시작 = page.getByRole('textbox', { name: '이벤트 시작' });
    this.이벤트종료 = page.getByRole('textbox', { name: '이벤트 종료' });
    this.종일일정 = page.getByRole('checkbox', { name: '종일 일정' });
    this.본문칸 = page.getByRole('textbox', { name: '공지사항', exact: true });
    this.발행일정 = page.getByRole('textbox', { name: '발행 일정' });
    this.생성 = page.getByRole('button', { name: '공지사항 생성' });
    this.저장 = page.getByRole('button', { name: '변경 사항을 저장' });
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
  }

  async 새폼열기(): Promise<void> {
    await this.page.goto(공지사항폼화면.주소);
    await this.생성.waitFor();
  }

  async 종료칸검증메시지(): Promise<string> {
    return this.이벤트종료.evaluate((칸) => (칸 as HTMLInputElement).validationMessage);
  }

  일정글(날짜: Date): string {
    const 두자리 = (수: number): string => String(수).padStart(2, '0');
    return `${날짜.getFullYear()}-${두자리(날짜.getMonth() + 1)}-${두자리(날짜.getDate())}T${두자리(날짜.getHours())}:${두자리(날짜.getMinutes())}`;
  }

  async 즉시발행하기(글: string): Promise<void> {
    await this.새폼열기();
    await this.본문칸.fill(글);
    await this.생성.click();
  }

  async 예약하기(글: string, 일정: Date): Promise<void> {
    await this.새폼열기();
    await this.본문칸.fill(글);
    await this.발행일정.fill(this.일정글(일정));
    await this.생성.click();
  }
}
