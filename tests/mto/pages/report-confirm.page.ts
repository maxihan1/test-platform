import type { Locator, Page } from '@playwright/test';

export class 신고조치확인화면 {
  static readonly 주소 = '/admin/reports/';

  readonly 제목: Locator;
  readonly 취소: Locator;
  readonly 확정: Locator;
  readonly 행동목록: Locator;
  readonly 경고메일줄: Locator;
  readonly 유예삭제줄: Locator;
  readonly 신고종결줄: Locator;
  readonly 처벌기록줄: Locator;
  readonly 경고미리보기: Locator;
  readonly 추가이유칸: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: /에 취할 중재 결정에 대한 확인$/, level: 1 });
    this.취소 = page.getByRole('link', { name: '취소' });
    this.확정 = page.getByRole('button', { name: '확정' });
    this.행동목록 = page.getByRole('listitem');
    this.경고메일줄 = this.행동목록.filter({ hasText: '경고 메일을 보냅니다' });
    this.유예삭제줄 = this.행동목록.filter({ hasText: '30일의 유예기간 이후에 삭제합니다' });
    this.신고종결줄 = this.행동목록.filter({ hasText: '모든 신고를 해결됨으로 처리합니다' });
    this.처벌기록줄 = this.행동목록.filter({ hasText: '처벌기록을 남깁니다' });
    this.경고미리보기 = page.getByText('는 다음 내용의 경고를 받게 됩니다:');
    this.추가이유칸 = page.getByRole('textbox', { name: '중재 결정에 대한 추가적인 이유.' });
  }

  안내문(문장: string): Locator {
    return this.page.getByText(문장);
  }
}
