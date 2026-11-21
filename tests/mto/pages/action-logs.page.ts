import type { Locator, Page } from '@playwright/test';

export class 감사로그화면 {
  static readonly 주소 = '/admin/action_logs';

  readonly 제목: Locator;
  readonly 사용자필터: Locator;
  readonly 동작필터: Locator;
  readonly 로그줄: Locator;
  readonly 빈화면: Locator;
  readonly 사용자필터글: Locator;
  readonly 동작필터글: Locator;
  readonly 사용자선택: Locator;
  readonly 동작선택: Locator;
  readonly 수정삭제: Locator;
  readonly 맨위시각: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '감사 로그', level: 1 });
    this.사용자필터 = page.getByRole('combobox', { name: '사용자 기준으로 필터' });
    this.동작필터 = page.getByRole('combobox', { name: '동작 별 필터' });
    this.로그줄 = page.locator('.log-entry');
    this.빈화면 = page.getByText('로그를 찾을 수 없습니다');
    this.사용자필터글 = page.getByText('사용자 기준으로 필터', { exact: true });
    this.동작필터글 = page.getByText('동작 별 필터', { exact: true });
    this.사용자선택 = page.locator('#account_id');
    this.동작선택 = page.locator('#action_type');
    this.수정삭제 = this.로그줄.getByRole('button', { name: /수정|삭제/ }).or(this.로그줄.getByRole('link', { name: /수정|삭제/ })).first();
    this.맨위시각 = this.로그줄.first().getByRole('time');
  }

  async 열기(조건 = ''): Promise<void> {
    await this.page.goto(`${감사로그화면.주소}${조건 ? `?${조건}` : ''}`);
    await this.제목.waitFor();
    await this.로그줄.first().or(this.빈화면).waitFor();
  }

  맨위줄(): Locator {
    return this.로그줄.first();
  }

  맨위줄에글(글: string): Locator {
    return this.로그줄.first().filter({ hasText: 글 });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.로그줄.first().or(this.빈화면).waitFor();
  }

  글이든줄(글: string): Locator {
    return this.로그줄.filter({ hasText: 글 });
  }

  글이없는줄(글: string): Locator {
    return this.로그줄.filter({ hasNotText: 글 });
  }

  async 사용자로거르기(이름: string): Promise<void> {
    const 다시그려짐 = this.page.waitForEvent('load');
    await this.사용자선택.selectOption({ label: 이름 });
    await 다시그려짐;
    await this.제목.waitFor();
    await this.로그줄.first().or(this.빈화면).waitFor();
  }

  async 동작으로거르기(이름: string): Promise<void> {
    const 다시그려짐 = this.page.waitForEvent('load');
    await this.동작선택.selectOption({ label: 이름 });
    await 다시그려짐;
    await this.제목.waitFor();
    await this.로그줄.first().or(this.빈화면).waitFor();
  }
}
