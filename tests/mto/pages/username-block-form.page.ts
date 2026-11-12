import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 사용자명규칙폼화면 {
  static readonly 주소 = '/admin/username_blocks/new';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 단어칸: Locator;
  readonly 비교방식: Locator;
  readonly 승인허용: Locator;
  readonly 규칙만들기: Locator;
  readonly 변경저장: Locator;
  readonly 비슷한문자설명: Locator;
  readonly 오류요약: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '새 유저네임 규칙 만들기', level: 1 });
    this.알림 = new 알림(page);
    this.단어칸 = page.getByRole('textbox', { name: '일치할 단어' });
    this.비교방식 = page.getByRole('combobox', { name: '비교 방식' });
    this.승인허용 = page.getByRole('checkbox', { name: '승인을 통한 가입 허용' });
    this.규칙만들기 = page.getByRole('button', { name: '규칙 만들기' });
    this.변경저장 = page.getByRole('button', { name: /^(변경 사항을 저장|규칙 저장|저장)/ });
    this.비슷한문자설명 = page.getByText(/비슷한 문자까지 매치됩니다/);
    this.오류요약 = page.getByText('오류가 발생했습니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(사용자명규칙폼화면.주소);
    await this.제목.waitFor();
    await this.규칙만들기.waitFor();
  }

  async 만들기(단어: string, 방식?: '일치' | '포함', 승인필요 = false): Promise<void> {
    await this.단어칸.fill(단어);
    if (방식 !== undefined) await this.비교방식.selectOption({ label: 방식 });
    if (승인필요) await this.승인허용.check();
    await this.규칙만들기.click();
    await this.page.waitForLoadState('load');
  }
}
