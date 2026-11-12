import type { Locator, Page } from '@playwright/test';

export class 공지사항알림미리보기화면 {
  static readonly 주소 = '/admin/announcements/';

  readonly 제목: Locator;
  readonly 메일발송: Locator;
  readonly 주의문구: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: '공지사항 알림 미리보기', level: 1 });
    this.메일발송 = page.getByRole('link', { name: /건의 메일 발송$/ });
    this.주의문구 = page.getByText(/^사용자들은 수신설정을 끌 수 없기 때문에/);
  }
}
