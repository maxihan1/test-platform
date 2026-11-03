import type { Locator, Page, Response } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

const 열번호 = { 아이디: 1, 이름: 2, 이메일: 3, 가입일: 4, 상태: 5 } as const;
const 상태값 = { 전체: '', 정상: 'active', 잠김: 'locked', 탈퇴: 'withdrawn' } as const;

export class 회원관리화면 {
  static readonly 주소 = '/ops/users';
  readonly 틀: 운영틀;
  readonly 제목: Locator;
  readonly 상태: Locator;
  readonly 검색칸: Locator;
  readonly 총인원: Locator;
  readonly 쪽표시: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 표: Locator;
  readonly 줄들: Locator;
  readonly 새비밀번호: Locator;
  readonly 비밀번호창제목: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.제목 = this.틀.본문.getByRole('heading', { name: '회원 관리', level: 1 });
    this.상태 = this.틀.본문.getByRole('combobox', { name: /^상태/ });
    this.검색칸 = this.틀.본문.getByLabel('검색', { exact: true });
    this.총인원 = this.틀.본문.getByText(/^총 [\d,]+명$/);
    this.쪽표시 = this.틀.본문.getByText(/^\d+ \/ \d+$/);
    this.이전 = this.틀.본문.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.틀.본문.getByRole('button', { name: '다음', exact: true });
    this.표 = this.틀.본문.getByRole('table');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.새비밀번호 = this.틀.확인창.getByLabel('새 비밀번호');
    this.비밀번호창제목 = this.틀.확인창.getByRole('heading', { name: /비밀번호 바꾸기$/ });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원관리화면.주소);
    await this.틀.다그려질때까지();
  }

  칸들(열: keyof typeof 열번호): Locator {
    return this.줄들.locator(`td:nth-child(${열번호[열]})`);
  }

  async 열이름들(): Promise<string[]> {
    const 글자들 = await this.표.getByRole('columnheader').allInnerTexts();
    return 글자들.map((글자) => 글자.trim()).filter((글자) => 글자 !== '');
  }

  회원줄(loginId: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('cell', { name: loginId, exact: true }) });
  }

  상태칸(loginId: string): Locator {
    return this.회원줄(loginId).locator(`td:nth-child(${열번호.상태})`);
  }

  줄버튼(loginId: string, 이름: string): Locator {
    return this.회원줄(loginId).getByRole('button', { name: 이름, exact: true });
  }

  get 창닫기(): Locator {
    return this.틀.확인창.locator('.modal-foot').getByRole('button', { name: '닫기', exact: true });
  }

  get 바꾸기(): Locator {
    return this.틀.확인창.getByRole('button', { name: '바꾸기', exact: true });
  }

  async 총인원수(): Promise<number> {
    const 글자 = await this.총인원.innerText();
    return Number(글자.replace(/[^\d]/g, ''));
  }

  async 쪽번호(): Promise<string> {
    const 글자 = await this.쪽표시.innerText();
    return 글자.split(' / ')[0] ?? '';
  }

  private 목록응답인가(응답: Response): boolean {
    return new URL(응답.url()).pathname === '/api/ops/users' && 응답.request().method() === 'GET';
  }

  private async 총인원그려질때까지(응답: Response): Promise<void> {
    const { total } = (await 응답.json()) as { total: number };
    await this.총인원.filter({ hasText: `총 ${total.toLocaleString('ko-KR')}명` }).waitFor();
  }

  async 검색하기(글자: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => this.목록응답인가(r) && new URL(r.url()).searchParams.get('q') === 글자);
    await this.검색칸.fill(글자);
    await this.총인원그려질때까지(await 응답);
  }

  async 상태고르기(이름: keyof typeof 상태값): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => this.목록응답인가(r) && new URL(r.url()).searchParams.get('status') === 상태값[이름]);
    await this.상태.selectOption({ label: 이름 });
    await this.총인원그려질때까지(await 응답);
  }

  async 다음쪽으로(): Promise<void> {
    await this.다음.click();
    await this.틀.본문.getByRole('button', { name: '이전', exact: true, disabled: false }).waitFor();
  }

  async 이전쪽으로(): Promise<void> {
    await this.이전.click();
    await this.틀.본문.getByRole('button', { name: '이전', exact: true, disabled: true }).waitFor();
  }
}
