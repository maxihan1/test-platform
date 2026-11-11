import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 신고목록화면 {
  static readonly 주소 = '/admin/reports';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 미해결: Locator;
  readonly 해결: Locator;
  readonly 전체: Locator;
  readonly 로컬: Locator;
  readonly 리모트: Locator;
  readonly 도메인칸: Locator;
  readonly 검색: Locator;
  readonly 초기화: Locator;
  readonly 카드들: Locator;
  readonly 다음쪽: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '신고', level: 1, exact: true });
    this.알림 = new 알림(page);
    this.미해결 = page.getByRole('link', { name: '미해결', exact: true });
    this.해결 = page.getByRole('link', { name: '해결', exact: true });
    this.전체 = page.getByRole('link', { name: '전체', exact: true });
    this.로컬 = page.getByRole('link', { name: '로컬', exact: true });
    this.리모트 = page.getByRole('link', { name: '리모트', exact: true });
    this.도메인칸 = page.getByRole('textbox', { name: '신고된 계정의 도메인' });
    this.검색 = page.getByRole('button', { name: '검색' });
    this.초기화 = page.getByRole('link', { name: '초기화' });
    this.카드들 = page.locator('.report-card');
    this.다음쪽 = page.getByRole('link', { name: '다음' });
  }

  async 열기(조건 = ''): Promise<void> {
    await this.page.goto(`${신고목록화면.주소}${조건 ? `?${조건}` : ''}`);
    await this.제목.waitFor();
    await this.검색.waitFor();
  }

  async 해결카드찾기(계정: string, 조건 = ''): Promise<boolean> {
    await this.열기(`resolved=1${조건 ? `&${조건}` : ''}`);
    for (let 쪽 = 0; 쪽 < 60; 쪽 += 1) {
      if ((await this.카드(계정).count()) > 0) return true;
      if ((await this.다음쪽.count()) === 0) return false;
      await this.다음쪽.click();
      await this.page.waitForLoadState('load');
      await this.제목.waitFor();
    }
    return false;
  }

  선택된필터(이름: string): Locator {
    return this.page.locator('.filter-subset a[aria-current="true"]').filter({ hasText: new RegExp(`^${이름}$`) });
  }

  async 필터누르기(링크: Locator, 이름: string): Promise<void> {
    await 링크.click();
    await this.선택된필터(이름).waitFor();
  }

  async 밑줄색(링크: Locator): Promise<string> {
    return 링크.evaluate((요소) => getComputedStyle(요소).borderBottomColor);
  }

  주소조건(이름: string): string | null {
    return new URL(this.page.url()).searchParams.get(이름);
  }

  카드(계정: string): Locator {
    return this.카드들.filter({ hasText: `@${계정}` });
  }

  제한없음(계정: string): Locator {
    return this.카드(계정).getByText('제한 없음');
  }

  참고사항링크(계정: string): Locator {
    return this.카드(계정).getByRole('link', { name: /^\d+ 개의 참고사항$/ });
  }

  신고줄들(계정: string): Locator {
    return this.카드(계정).locator('.report-card__summary__item');
  }

  신고자들(계정: string): Locator {
    return this.카드(계정).locator('.report-card__summary__item__reported-by');
  }

  사유들(계정: string): Locator {
    return this.카드(계정).locator('.one-line');
  }

  게시물수들(계정: string): Locator {
    return this.카드(계정).getByTitle('게시물', { exact: true });
  }

  미디어수들(계정: string): Locator {
    return this.카드(계정).getByTitle('첨부된 미디어', { exact: true });
  }

  컬렉션수들(계정: string): Locator {
    return this.카드(계정).getByTitle('컬렉션', { exact: true });
  }

  할당된중재자(계정: string, 중재자: string): Locator {
    return this.카드(계정).getByRole('link', { name: 중재자, exact: true });
  }

  신고링크(계정: string): Locator {
    return this.카드(계정).locator('.report-card__summary__item__content a').first();
  }

  사유링크(사유: string): Locator {
    return this.page.getByRole('link', { name: 사유 });
  }
}
