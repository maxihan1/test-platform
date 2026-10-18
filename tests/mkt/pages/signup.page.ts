import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';
import { 모달 } from '../components/modal.component.js';
import { 토스트 } from '../components/toast.component.js';
import { 두프레임뒤 } from '../helpers/common-tools.helper.js';

export type 칸이름 = 'loginId' | 'password' | 'passwordConfirm' | 'name' | 'email' | 'phone';
export type 약관이름 = '이용약관' | '개인정보' | '마케팅';

export const 칸오류문구: Record<칸이름, string> = {
  loginId: '아이디는 영문 소문자·숫자 4~12자입니다',
  password: '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다',
  passwordConfirm: '비밀번호가 일치하지 않습니다',
  name: '이름은 2~10자입니다',
  email: '이메일 형식이 올바르지 않습니다',
  phone: '휴대폰 번호는 숫자 10~11자입니다',
};

export class 회원가입화면 {
  static readonly 주소 = '/signup';
  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 중복확인버튼: Locator;
  readonly 비밀번호: Locator;
  readonly 비밀번호보기버튼: Locator;
  readonly 비밀번호확인: Locator;
  readonly 이름: Locator;
  readonly 이메일: Locator;
  readonly 휴대폰: Locator;
  readonly 생년월일: Locator;
  readonly 성별선택안함: Locator;
  readonly 성별남성: Locator;
  readonly 성별여성: Locator;
  readonly 관심분야: Locator;
  readonly 전체동의: Locator;
  readonly 이용약관동의: Locator;
  readonly 개인정보동의: Locator;
  readonly 마케팅동의: Locator;
  readonly 가입하기버튼: Locator;
  readonly 입력칸들: Locator;
  readonly 머리글: 머리글;
  readonly 모달: 모달;
  readonly 토스트: 토스트;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.제목 = page.getByRole('heading', { name: '회원가입', level: 1 });
    this.아이디 = 본문.getByLabel('아이디', { exact: true });
    this.중복확인버튼 = 본문.getByRole('button', { name: '중복 확인' });
    this.비밀번호 = 본문.getByLabel('비밀번호', { exact: true });
    this.비밀번호보기버튼 = 본문.getByRole('button', { name: '비밀번호 보기' });
    this.비밀번호확인 = 본문.getByLabel('비밀번호 확인', { exact: true });
    this.이름 = 본문.getByLabel('이름', { exact: true });
    this.이메일 = 본문.getByLabel('이메일', { exact: true });
    this.휴대폰 = 본문.getByLabel('휴대폰', { exact: true });
    this.생년월일 = 본문.getByLabel('생년월일', { exact: true });
    this.성별선택안함 = 본문.getByRole('radio', { name: '선택 안 함' });
    this.성별남성 = 본문.getByRole('radio', { name: '남성' });
    this.성별여성 = 본문.getByRole('radio', { name: '여성' });
    this.관심분야 = 본문.getByRole('group', { name: '관심 분야 (최대 3개)' });
    this.전체동의 = 본문.getByRole('checkbox', { name: '전체 동의' });
    this.이용약관동의 = 본문.getByRole('checkbox', { name: '(필수) 이용약관 동의' });
    this.개인정보동의 = 본문.getByRole('checkbox', { name: '(필수) 개인정보 수집 동의' });
    this.마케팅동의 = 본문.getByRole('checkbox', { name: '(선택) 마케팅 수신 동의' });
    this.가입하기버튼 = 본문.getByRole('button', { name: '가입하기' });
    this.입력칸들 = 본문.getByRole('textbox');
    this.머리글 = new 머리글(page);
    this.모달 = new 모달(page);
    this.토스트 = new 토스트(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원가입화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }

  칸(이름: 칸이름): Locator {
    const 칸들: Record<칸이름, Locator> = {
      loginId: this.아이디,
      password: this.비밀번호,
      passwordConfirm: this.비밀번호확인,
      name: this.이름,
      email: this.이메일,
      phone: this.휴대폰,
    };
    return 칸들[이름];
  }

  오류문구(이름: 칸이름): Locator {
    return this.page.locator('main').getByText(칸오류문구[이름], { exact: true });
  }

  안내(이름: 칸이름): Locator {
    return this.page.locator(`main .msg[data-for="${이름}"]`);
  }

  관심분야칸(이름: string): Locator {
    return this.관심분야.getByRole('checkbox', { name: 이름, exact: true });
  }

  약관보기버튼(약관: 약관이름): Locator {
    const 글: Record<약관이름, string> = { 이용약관: '이용약관 동의', 개인정보: '개인정보 수집 동의', 마케팅: '마케팅 수신 동의' };
    return this.page.locator('main .term').filter({ hasText: 글[약관] }).getByRole('button', { name: '보기' });
  }

  약관창(약관: 약관이름): Locator {
    const 제목: Record<약관이름, string> = { 이용약관: '이용약관', 개인정보: '개인정보 수집 및 이용', 마케팅: '마케팅 정보 수신' };
    return this.page.getByRole('dialog', { name: 제목[약관], exact: true });
  }

  약관창확인버튼(창: Locator): Locator {
    return 창.getByRole('button', { name: '확인', exact: true });
  }

  async 입력하기(이름: 칸이름, 값: string): Promise<void> {
    await this.칸(이름).fill(값);
  }

  async 칸을비운채옮기기(이름: 칸이름): Promise<void> {
    await this.칸(이름).click();
    await this.칸(이름).blur();
    await 두프레임뒤(this.page);
  }

  async 칸값(이름: 칸이름): Promise<string> {
    return this.칸(이름).inputValue();
  }

  async 중복확인하기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/auth/check-id'));
    await this.중복확인버튼.click();
    await 응답;
  }

  async 오류문구빨강인가(이름: 칸이름): Promise<boolean> {
    return this.오류문구(이름).evaluate((글) => {
      const 색 = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(글).color);
      if (!색) return false;
      return Number(색[1]) > 150 && Number(색[2]) < 90 && Number(색[3]) < 90;
    });
  }

  async 필수칸채우기(값: { loginId: string; password: string; name: string; email: string }): Promise<void> {
    await this.아이디.fill(값.loginId);
    await this.비밀번호.fill(값.password);
    await this.비밀번호확인.fill(값.password);
    await this.이름.fill(값.name);
    await this.이메일.fill(값.email);
  }

  async 필수약관켜기(): Promise<void> {
    await this.이용약관동의.check();
    await this.개인정보동의.check();
  }

  async 눈모양누르기(): Promise<void> {
    await this.비밀번호보기버튼.click();
  }

  async 비밀번호칸종류(): Promise<string | null> {
    return this.비밀번호.getAttribute('type');
  }
}

export class 가입완료화면 {
  static readonly 주소 = '/signup/done';
  readonly 제목: Locator;
  readonly 환영문구: Locator;
  readonly 로그인하러가기: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: /가입을 환영합니다$/, level: 1 });
    this.환영문구 = this.제목;
    this.로그인하러가기 = page.locator('main').getByRole('link', { name: '로그인하러 가기' });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(가입완료화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }
}
