import type { Locator, Page } from '@playwright/test';

import { 제목 } from '../components/title.component.js';

export class 로그인화면 {
  constructor(private readonly page: Page) {}

  async 연다(): Promise<void> {
    await this.page.goto('/loginForm');
  }

  get 아이디칸(): Locator {
    return this.page.getByPlaceholder('이메일을 입력하세요.');
  }

  get 비밀번호칸(): Locator {
    return this.page.getByPlaceholder('비밀번호를 입력하세요.');
  }

  get 로그인버튼(): Locator {
    return this.page.getByRole('button', { name: '로그인', exact: true });
  }

  async 로그인한다(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸.fill(아이디);
    await this.비밀번호칸.fill(비밀번호);
    await this.로그인버튼.click();
  }

  get 제목(): Locator {
    return new 제목(this.page).중제목('로그인');
  }

  get 안내문구(): Locator {
    return this.page.getByText('서울 계정으로 로그인', { exact: true });
  }

  get 회원가입버튼(): Locator {
    return this.page.getByRole('button', { name: '회원가입', exact: true });
  }

  get 비밀번호찾기링크(): Locator {
    return this.page.getByRole('link', { name: '비밀번호 찾기', exact: true });
  }

  get 비밀번호숨기기버튼(): Locator {
    return this.page.getByRole('button', { name: '비밀번호 숨기기', exact: true });
  }

  async 아이디를적는다(글자: string): Promise<void> {
    await this.아이디칸.fill(글자);
  }

  async 비밀번호를적는다(글자: string): Promise<void> {
    await this.비밀번호칸.fill(글자);
  }

  async 아이디와비밀번호를비운다(): Promise<void> {
    await this.아이디칸.fill('');
    await this.비밀번호칸.fill('');
  }

  async 비밀번호보기를누른다(): Promise<void> {
    await this.page.getByRole('button', { name: '비밀번호 보기', exact: true }).click();
  }

  async 로그인을누른다(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 회원가입을누른다(): Promise<void> {
    await this.회원가입버튼.click();
  }

  async 비밀번호찾기를누른다(): Promise<void> {
    await this.비밀번호찾기링크.click();
  }

  async 비밀번호를가리는가(): Promise<boolean> {
    return (await this.비밀번호칸.getAttribute('type')) === 'password';
  }

  async 비밀번호칸에보이는글자(): Promise<string> {
    if ((await this.비밀번호칸.getAttribute('type')) !== 'text') return '';
    return this.비밀번호칸.inputValue();
  }

  async 현재경로(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
