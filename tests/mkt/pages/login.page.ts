import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 로그인화면 {
  static readonly 주소 = '/login';
  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 상태유지: Locator;
  readonly 로그인버튼: Locator;
  readonly 오류: Locator;
  readonly 회원가입링크: Locator;
  readonly 비밀번호찾기링크: Locator;
  readonly 머리글: 머리글;
  readonly 오류안내: Locator;
  readonly 회원가입화면가입버튼: Locator;
  readonly 비밀번호찾기화면받기버튼: Locator;
  readonly 회원가입화면제목: Locator;
  readonly 비밀번호찾기화면제목: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.제목 = page.getByRole('heading', { name: '로그인', level: 1 });
    this.아이디 = 본문.getByLabel('아이디');
    this.비밀번호 = 본문.getByLabel('비밀번호');
    this.상태유지 = 본문.getByLabel('로그인 상태 유지');
    this.로그인버튼 = 본문.getByRole('button', { name: '로그인' });
    this.오류 = 본문.locator('.login-error');
    this.회원가입링크 = 본문.getByRole('link', { name: '회원가입' });
    this.비밀번호찾기링크 = 본문.getByRole('link', { name: '비밀번호 찾기' });
    this.머리글 = new 머리글(page);
    this.오류안내 = 본문.getByRole('alert');
    this.회원가입화면가입버튼 = 본문.getByRole('button', { name: '가입하기' });
    this.비밀번호찾기화면받기버튼 = 본문.getByRole('button', { name: '임시 비밀번호 받기' });
    this.회원가입화면제목 = page.getByRole('heading', { name: '회원가입', level: 1 });
    this.비밀번호찾기화면제목 = page.getByRole('heading', { name: '비밀번호 찾기', level: 1 });
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }

  async 채우기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.채우기(아이디, 비밀번호);
    await this.로그인버튼.click();
  }

  async 제출이끝날때까지(): Promise<void> {
    await this.로그인버튼.waitFor();
  }

  async 틀린로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.로그인하기(아이디, 비밀번호);
    await this.제출이끝날때까지();
  }

  async 엔터로로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.채우기(아이디, 비밀번호);
    await this.비밀번호.press('Enter');
  }

  async 로그인결과나올때까지(): Promise<void> {
    await this.머리글.영역.locator('.logout').or(this.오류.filter({ hasText: /\S/ })).first().waitFor({ state: 'attached' });
  }

  async 그려질때까지(): Promise<void> {
    await this.로그인버튼.waitFor();
    await this.머리글.그려질때까지();
  }
}
