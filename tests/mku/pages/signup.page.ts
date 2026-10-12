import type { Locator, Page } from '@playwright/test';

export type 안내칸 = 'loginId' | 'password' | 'passwordConfirm' | 'name' | 'email' | 'phone';

export interface 가입정보 {
  loginId: string;
  password: string;
  name: string;
  email: string;
}

export class 회원가입화면 {
  static readonly 주소 = '/signup';

  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 중복확인: Locator;
  readonly 비밀번호: Locator;
  readonly 비밀번호보기: Locator;
  readonly 비밀번호확인: Locator;
  readonly 이름: Locator;
  readonly 이메일: Locator;
  readonly 휴대폰: Locator;
  readonly 생년월일: Locator;
  readonly 성별안함: Locator;
  readonly 성별남성: Locator;
  readonly 성별여성: Locator;
  readonly 관심패션: Locator;
  readonly 관심전자기기: Locator;
  readonly 관심도서: Locator;
  readonly 관심식품: Locator;
  readonly 전체동의: Locator;
  readonly 이용약관동의: Locator;
  readonly 개인정보동의: Locator;
  readonly 마케팅동의: Locator;
  readonly 이용약관보기: Locator;
  readonly 가입하기: Locator;
  readonly 제출오류: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '회원가입', level: 1 });
    this.아이디 = 본문.getByLabel('아이디', { exact: true });
    this.중복확인 = 본문.getByRole('button', { name: '중복 확인' });
    this.비밀번호 = 본문.getByLabel('비밀번호', { exact: true });
    this.비밀번호보기 = 본문.getByRole('button', { name: '비밀번호 보기' });
    this.비밀번호확인 = 본문.getByLabel('비밀번호 확인', { exact: true });
    this.이름 = 본문.getByLabel('이름', { exact: true });
    this.이메일 = 본문.getByLabel('이메일', { exact: true });
    this.휴대폰 = 본문.getByLabel('휴대폰', { exact: true });
    this.생년월일 = 본문.getByLabel('생년월일', { exact: true });
    this.성별안함 = 본문.getByRole('radio', { name: '선택 안 함' });
    this.성별남성 = 본문.getByRole('radio', { name: '남성' });
    this.성별여성 = 본문.getByRole('radio', { name: '여성' });
    this.관심패션 = 본문.getByRole('checkbox', { name: '패션' });
    this.관심전자기기 = 본문.getByRole('checkbox', { name: '전자기기' });
    this.관심도서 = 본문.getByRole('checkbox', { name: '도서' });
    this.관심식품 = 본문.getByRole('checkbox', { name: '식품' });
    this.전체동의 = 본문.getByRole('checkbox', { name: '전체 동의' });
    this.이용약관동의 = 본문.getByRole('checkbox', { name: '(필수) 이용약관 동의' });
    this.개인정보동의 = 본문.getByRole('checkbox', { name: '(필수) 개인정보 수집 동의' });
    this.마케팅동의 = 본문.getByRole('checkbox', { name: '(선택) 마케팅 수신 동의' });
    this.이용약관보기 = 본문.locator('button.view[data-term="terms"]');
    this.가입하기 = 본문.locator('button.join');
    this.제출오류 = 본문.getByRole('alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원가입화면.주소);
  }

  안내(칸: 안내칸): Locator {
    return this.page.getByRole('main').locator(`p.msg[data-for="${칸}"]`);
  }

  async 적기(칸: Locator, 글: string): Promise<void> {
    await 칸.fill('');
    await 칸.pressSequentially(글);
  }

  async 적고옮기기(칸: Locator, 글: string): Promise<void> {
    await this.적기(칸, 글);
    await 칸.blur();
  }

  async 켜진관심분야수(): Promise<number> {
    const 칸들 = [this.관심패션, this.관심전자기기, this.관심도서, this.관심식품];
    let 개수 = 0;
    for (const 칸 of 칸들) {
      if (await 칸.isChecked()) 개수 += 1;
    }
    return 개수;
  }

  async 칸채우기(정보: 가입정보): Promise<void> {
    await this.아이디.fill(정보.loginId);
    await this.비밀번호.fill(정보.password);
    await this.비밀번호확인.fill(정보.password);
    await this.이름.fill(정보.name);
    await this.이메일.fill(정보.email);
  }

  async 중복확인하기(): Promise<void> {
    await this.중복확인.click();
    await this.중복확인.waitFor();
  }

  async 필수약관켜기(): Promise<void> {
    await this.이용약관동의.check();
    await this.개인정보동의.check();
  }

  async 가입준비하기(정보: 가입정보): Promise<void> {
    await this.칸채우기(정보);
    await this.중복확인하기();
    await this.필수약관켜기();
  }

  async 이름표없는입력칸수(): Promise<number> {
    return this.page.getByRole('main').locator('input').evaluateAll(
      (칸) => (칸 as HTMLInputElement[]).filter((c) => c.type !== 'hidden' && (c.labels === null || c.labels.length === 0) && !c.hasAttribute('aria-label')).length,
    );
  }
}
