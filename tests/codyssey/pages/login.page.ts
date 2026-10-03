import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  readonly 회원가입버튼: Locator;
  readonly 비밀번호찾기링크: Locator;
  readonly 비밀번호보기버튼: Locator;
  readonly 비밀번호숨기기버튼: Locator;
  readonly 다른지역버튼: Locator;
  readonly 대전캠퍼스링크: Locator;
  readonly 경남캠퍼스링크: Locator;

  constructor(page: Page) {
    this.회원가입버튼 = page.getByRole('button', { name: '회원가입' });
    this.비밀번호찾기링크 = page.getByRole('link', { name: '비밀번호 찾기' });
    this.비밀번호보기버튼 = page.getByRole('button', { name: '비밀번호 보기' });
    this.비밀번호숨기기버튼 = page.getByRole('button', { name: '비밀번호 숨기기' });
    this.다른지역버튼 = page.getByRole('button', { name: '다른 지역이신가요?' });
    this.대전캠퍼스링크 = page.getByRole('link', { name: '대전 캠퍼스' });
    this.경남캠퍼스링크 = page.getByRole('link', { name: '경남 캠퍼스' });
  }

  async 다른지역펼치기(): Promise<void> {
    await this.다른지역버튼.click();
  }

  async 비밀번호보기누르기(): Promise<void> {
    await this.비밀번호보기버튼.click();
  }
}
