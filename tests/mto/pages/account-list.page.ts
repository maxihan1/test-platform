import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 계정목록화면 {
  static readonly 주소 = '/admin/accounts?origin=local';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 아이디칸: Locator;
  readonly 표시이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly IP칸: Locator;
  readonly 도메인칸: Locator;
  readonly 검색: Locator;
  readonly 초기화: Locator;
  readonly 허가: Locator;
  readonly 거부: Locator;
  readonly 정지: Locator;
  readonly 전체선택: Locator;
  readonly 행들: Locator;
  readonly 빈목록: Locator;
  readonly 위치필터: Locator;
  readonly 관리필터: Locator;
  readonly 역할필터: Locator;
  readonly 정렬필터: Locator;
  readonly 검색칸들: Locator;
  readonly 도구줄버튼들: Locator;
  readonly 전체선택안내: Locator;
  readonly 행아이디들: Locator;
  readonly 중재메뉴계정: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '계정', level: 1 });
    this.알림 = new 알림(page);
    this.아이디칸 = page.getByRole('textbox', { name: '아이디' });
    this.표시이름칸 = page.getByRole('textbox', { name: '표시되는 이름' });
    this.이메일칸 = page.getByRole('textbox', { name: '이메일' });
    this.IP칸 = page.getByRole('textbox', { name: 'IP' });
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.검색 = page.getByRole('button', { name: '검색' });
    this.초기화 = page.getByRole('link', { name: '초기화' });
    this.허가 = page.getByRole('button', { name: '허가' });
    this.거부 = page.getByRole('button', { name: '거부' });
    this.정지 = page.getByRole('button', { name: '정지' });
    this.전체선택 = page.locator('#batch_checkbox_all');
    this.행들 = page.locator('.batch-table__row');
    this.빈목록 = page.locator('.batch-table__empty, .muted-hint').or(page.getByText('아무 것도 없습니다!'));
    const 필터 = (이름: string): Locator => page.locator('.filter-subset').filter({ has: page.getByText(이름, { exact: true }) }).getByRole('combobox');
    this.위치필터 = 필터('위치');
    this.관리필터 = 필터('관리');
    this.역할필터 = 필터('역할');
    this.정렬필터 = 필터('정렬');
    this.검색칸들 = page.locator('.fields-group').getByRole('textbox');
    this.도구줄버튼들 = page.locator('.batch-table__toolbar__actions').getByRole('button');
    this.전체선택안내 = page.getByText(/검색에 잡힌 \d+개의 항목을 모두 선택하기/);
    this.행아이디들 = this.행들.locator('.display-name__account');
    this.중재메뉴계정 = page.getByRole('banner').getByRole('listitem').filter({ has: page.getByRole('link', { name: '중재', exact: true }) }).getByRole('link', { name: '계정', exact: true });
  }

  async 열기(조건 = 'origin=local'): Promise<void> {
    await this.page.goto(`/admin/accounts?${조건}`);
    await this.제목.waitFor();
  }

  행(아이디: string): Locator {
    return this.행들.filter({ hasText: `@${아이디}` });
  }

  행선택칸(아이디: string): Locator {
    return this.행(아이디).getByRole('checkbox');
  }

  계정이름링크(아이디: string): Locator {
    return this.행(아이디).getByRole('link', { name: new RegExp(`@${아이디}$`) });
  }

  async 아이디로찾기(아이디: string): Promise<void> {
    await this.page.goto(`/admin/accounts?origin=local&username=${encodeURIComponent(아이디)}`);
    await this.제목.waitFor();
    await this.행(아이디).or(this.빈목록).first().waitFor();
  }

  async 대기목록열기(): Promise<void> {
    await this.열기('status=pending');
  }

  행흐림(아이디: string): Locator {
    return this.행(아이디).and(this.page.locator('.batch-table__row--muted'));
  }

  가입이유인용(아이디: string): Locator {
    return this.행(아이디).locator('.batch-table__row__content__quote');
  }

  행게시물수(아이디: string): Locator {
    return this.행(아이디).getByRole('cell', { name: /게시물$/ });
  }

  행팔로워수(아이디: string): Locator {
    return this.행(아이디).getByRole('cell', { name: /팔로워$/ });
  }

  행최근활동(아이디: string): Locator {
    return this.행(아이디).getByRole('cell', { name: /최근 활동$/ });
  }

  행이메일도메인(아이디: string): Locator {
    return this.행(아이디).getByRole('link', { name: /^[a-z0-9-]+(\.[a-z0-9-]+)+$/ });
  }

  async 선택지글(필터: Locator): Promise<string> {
    const 글들 = await 필터.getByRole('option').allTextContents();
    return 글들.map((글) => 글.trim().replace(/\d+/g, 'N')).join(', ');
  }

  async 검색하기(칸: Locator, 글: string): Promise<void> {
    await 칸.fill(글);
    await this.검색.click();
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }

  async 주소값(이름: string): Promise<string | null> {
    return new URL(this.page.url()).searchParams.get(이름);
  }

  async 필터고르기(필터: Locator, 이름: string, 값: string): Promise<void> {
    const 이동 = this.page.waitForURL((주소) => 주소.searchParams.get(이름) === 값);
    await 필터.selectOption({ value: 값 });
    await 이동;
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }

  async 일괄처리하기(버튼: Locator): Promise<void> {
    const 이동 = this.page.waitForResponse((응답) => 응답.request().isNavigationRequest() && 응답.request().method() === 'GET' && 응답.url().includes('/admin/accounts'));
    await 버튼.click();
    await 이동;
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }
}
