import type { Locator, Page } from '@playwright/test';

export interface 가입값 {
  아이디: string;
  비밀번호: string;
  이름: string;
  이메일: string;
}

export class 회원가입화면 {
  constructor(private readonly page: Page) {}

  private 칸(이름: string): Locator {
    return this.page.getByLabel(new RegExp(`^${이름}( \\*)?$`));
  }

  get 아이디(): Locator {
    return this.칸('아이디');
  }

  get 비밀번호(): Locator {
    return this.칸('비밀번호');
  }

  get 비밀번호확인(): Locator {
    return this.칸('비밀번호 확인');
  }

  get 이름(): Locator {
    return this.칸('이름');
  }

  get 이메일(): Locator {
    return this.칸('이메일');
  }

  get 휴대폰(): Locator {
    return this.칸('휴대폰');
  }

  get 생년월일(): Locator {
    return this.칸('생년월일');
  }

  get 중복확인(): Locator {
    return this.page.getByRole('button', { name: '중복 확인', exact: true });
  }

  get 눈버튼(): Locator {
    return this.page.getByRole('button', { name: '비밀번호 보기' });
  }

  get 가입버튼(): Locator {
    return this.page.getByRole('button', { name: '가입하기', exact: true });
  }

  get 전체동의(): Locator {
    return this.page.getByRole('checkbox', { name: '전체 동의' });
  }

  get 이용약관(): Locator {
    return this.page.getByRole('checkbox', { name: '(필수) 이용약관 동의' });
  }

  get 개인정보(): Locator {
    return this.page.getByRole('checkbox', { name: '(필수) 개인정보 수집 동의' });
  }

  get 마케팅(): Locator {
    return this.page.getByRole('checkbox', { name: '(선택) 마케팅 수신 동의' });
  }

  성별(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름, exact: true });
  }

  관심분야(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  보기(종류: 'terms' | 'privacy' | 'marketing'): Locator {
    return this.page.locator(`.view[data-term="${종류}"]`);
  }

  문구(글자: string): Locator {
    return this.page.getByText(글자, { exact: true });
  }

  빨간문구(글자: string): Locator {
    return this.page.locator('.error-text', { hasText: 글자 });
  }

  토스트문구(글자: string): Locator {
    return this.page.locator('#toast-box .toast', { hasText: 글자 });
  }

  약관모달(제목: string): Locator {
    return this.page.getByRole('dialog', { name: 제목 });
  }

  약관확인버튼(제목: string): Locator {
    return this.약관모달(제목).getByRole('button', { name: '확인', exact: true });
  }

  약관닫기X(제목: string): Locator {
    return this.약관모달(제목).locator('.modal-x');
  }

  get 모달바깥(): Locator {
    return this.page.locator('.modal-backdrop');
  }

  get 환영제목(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get 로그인하러가기(): Locator {
    return this.page.getByRole('link', { name: '로그인하러 가기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/signup');
    await this.가입버튼.waitFor();
  }

  async 중복확인을한다(): Promise<void> {
    await this.중복확인.click();
    await this.중복확인.waitFor();
  }

  async 필수입력을채운다(값: 가입값): Promise<void> {
    await this.아이디.fill(값.아이디);
    await this.비밀번호.fill(값.비밀번호);
    await this.비밀번호확인.fill(값.비밀번호);
    await this.이름.fill(값.이름);
    await this.이메일.fill(값.이메일);
  }

  async 필수약관에동의한다(): Promise<void> {
    await this.이용약관.check();
    await this.개인정보.check();
  }

  async 약관을연다(종류: 'terms' | 'privacy' | 'marketing', 제목: string): Promise<void> {
    await this.보기(종류).click();
    await this.약관확인버튼(제목).waitFor();
  }

  async 입력종류(칸: Locator): Promise<string | null> {
    return 칸.getAttribute('type');
  }

  async 입력값(칸: Locator): Promise<string> {
    return 칸.inputValue();
  }
}
