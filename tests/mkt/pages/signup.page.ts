import type { Locator, Page } from '@playwright/test';

export class 회원가입화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/signup');
  }

  아이디칸(): Locator {
    return this.page.getByLabel('아이디', { exact: true });
  }

  비밀번호칸(): Locator {
    return this.page.getByLabel('비밀번호', { exact: true });
  }

  비밀번호확인칸(): Locator {
    return this.page.getByLabel('비밀번호 확인', { exact: true });
  }

  이름칸(): Locator {
    return this.page.getByLabel('이름', { exact: true });
  }

  이메일칸(): Locator {
    return this.page.getByLabel('이메일', { exact: true });
  }

  휴대폰칸(): Locator {
    return this.page.getByLabel('휴대폰', { exact: true });
  }

  생년월일칸(): Locator {
    return this.page.getByLabel('생년월일', { exact: true });
  }

  중복확인버튼(): Locator {
    return this.page.getByRole('button', { name: '중복 확인', exact: true });
  }

  비밀번호보기버튼(): Locator {
    return this.page.getByRole('button', { name: '비밀번호 보기', exact: true });
  }

  성별라디오(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름, exact: true });
  }

  관심분야체크(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  전체동의체크(): Locator {
    return this.page.getByRole('checkbox', { name: '전체 동의', exact: true });
  }

  약관체크(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  약관보기버튼(약관이름: string): Locator {
    return this.page
      .locator('.term')
      .filter({ has: this.약관체크(약관이름) })
      .getByRole('button', { name: '보기', exact: true });
  }

  입력안내(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  async 휴대폰안내글자(): Promise<string | null> {
    return this.휴대폰칸().getAttribute('placeholder');
  }

  async 필수표시(라벨: string): Promise<string> {
    const 내용 = await this.page
      .locator('label')
      .filter({ hasText: new RegExp(`^${라벨}$`) })
      .evaluate((칸) => getComputedStyle(칸, '::after').content);
    return 내용.replace(/["\s]/g, '');
  }

  가입하기버튼(): Locator {
    return this.page.getByRole('button', { name: '가입하기', exact: true });
  }

  async 아이디적기(값: string): Promise<void> {
    await this.아이디칸().fill(값);
  }

  async 중복확인하기(): Promise<void> {
    await this.중복확인버튼().click();
  }

  async 관심분야고르기(이름: string): Promise<void> {
    await this.관심분야체크(이름).click();
  }

  async 필수항목채우기(아이디: string, 비밀번호: string, 이름: string, 이메일: string): Promise<void> {
    await this.아이디칸().fill(아이디);
    await this.비밀번호칸().fill(비밀번호);
    await this.비밀번호확인칸().fill(비밀번호);
    await this.이름칸().fill(이름);
    await this.이메일칸().fill(이메일);
  }

  async 필수약관동의하기(): Promise<void> {
    await this.약관체크('(필수) 이용약관 동의').check();
    await this.약관체크('(필수) 개인정보 수집 동의').check();
  }

  async ESC누르기(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
