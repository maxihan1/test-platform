import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 두프레임기다리기 } from '../helpers/common-tools.helper.js';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly 머리: 머리글;
  readonly 큰제목: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 상태유지: Locator;
  readonly 오류: Locator;
  readonly 로그인버튼: Locator;
  readonly 로딩표시: Locator;
  readonly 회원가입링크: Locator;
  readonly 비밀번호찾기링크: Locator;
  readonly 일반오류: Locator;
  readonly 잠금안내: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.큰제목 = page.getByRole('heading', { level: 1, name: '로그인', exact: true });
    this.아이디 = page.getByLabel('아이디', { exact: true });
    this.비밀번호 = page.getByLabel('비밀번호', { exact: true });
    this.상태유지 = page.getByRole('checkbox', { name: '로그인 상태 유지', exact: true });
    this.오류 = page.getByRole('alert');
    this.로그인버튼 = page.getByRole('button', { name: /^(로그인|처리 중)$/ });
    this.로딩표시 = this.로그인버튼.getByLabel('처리 중');
    this.회원가입링크 = page.getByRole('main').getByRole('link', { name: '회원가입', exact: true });
    this.비밀번호찾기링크 = page.getByRole('main').getByRole('link', { name: '비밀번호 찾기', exact: true });
    this.일반오류 = page.getByText('아이디 또는 비밀번호가 올바르지 않습니다', { exact: true });
    this.잠금안내 = page.getByText('로그인 5회 실패로 10분간 로그인할 수 없습니다', { exact: true });
  }

  async 열기(다음?: string): Promise<void> {
    const 쿼리 = 다음 === undefined ? '' : `?next=${encodeURIComponent(다음)}`;
    await this.page.goto(`${로그인화면.주소}${쿼리}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.큰제목.waitFor();
    await this.머리.그려질때까지();
  }

  async 적기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
  }

  async 로그인누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 실패하는시도(아이디: string, 비밀번호: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/auth/login'));
    await this.적기(아이디, 비밀번호);
    await this.로그인누르기();
    await 응답;
    await 두프레임기다리기(this.page);
  }

  async 탭으로버튼까지옮기기(): Promise<void> {
    for (let 번 = 0; 번 < 6; 번 += 1) {
      if (await this.로그인버튼에초점인가()) return;
      await this.page.keyboard.press('Tab');
    }
  }

  async 로그인버튼에초점인가(): Promise<boolean> {
    return this.로그인버튼.evaluate((버튼) => 버튼 === document.activeElement);
  }
}
