import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 두프레임기다리기 } from '../helpers/common-tools.helper.js';
import { 모달 } from '../components/modal.component.js';
import { 토스트 } from '../components/toast.component.js';

export interface 가입값 {
  loginId: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
}

export type 약관 = '이용약관' | '개인정보 수집' | '마케팅 수신';

export class 회원가입화면 {
  static readonly 주소 = '/signup';

  readonly 머리: 머리글;
  readonly 토스트창: 토스트;
  readonly 큰제목: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 비밀번호확인: Locator;
  readonly 이름: Locator;
  readonly 이메일: Locator;
  readonly 휴대폰: Locator;
  readonly 생년월일: Locator;
  readonly 중복확인: Locator;
  readonly 눈: Locator;
  readonly 전체동의: Locator;
  readonly 이용약관동의: Locator;
  readonly 개인정보동의: Locator;
  readonly 마케팅동의: Locator;
  readonly 가입하기: Locator;
  readonly 가입오류: Locator;
  readonly 아이디오류: Locator;
  readonly 비밀번호오류: Locator;
  readonly 비밀번호확인오류: Locator;
  readonly 이름오류: Locator;
  readonly 이메일오류: Locator;
  readonly 휴대폰오류: Locator;
  readonly 사용가능: Locator;
  readonly 사용중: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.토스트창 = new 토스트(page);
    this.큰제목 = page.getByRole('heading', { level: 1, name: '회원가입', exact: true });
    this.아이디 = page.getByLabel('아이디', { exact: true });
    this.비밀번호 = page.getByLabel('비밀번호', { exact: true });
    this.비밀번호확인 = page.getByLabel('비밀번호 확인', { exact: true });
    this.이름 = page.getByLabel('이름', { exact: true });
    this.이메일 = page.getByLabel('이메일', { exact: true });
    this.휴대폰 = page.getByLabel('휴대폰', { exact: true });
    this.생년월일 = page.getByLabel('생년월일', { exact: true });
    this.중복확인 = page.getByRole('button', { name: /^(중복 확인|처리 중)$/ });
    this.눈 = page.getByRole('button', { name: '비밀번호 보기', exact: true });
    this.전체동의 = page.getByRole('checkbox', { name: '전체 동의', exact: true });
    this.이용약관동의 = page.getByRole('checkbox', { name: '(필수) 이용약관 동의', exact: true });
    this.개인정보동의 = page.getByRole('checkbox', { name: '(필수) 개인정보 수집 동의', exact: true });
    this.마케팅동의 = page.getByRole('checkbox', { name: '(선택) 마케팅 수신 동의', exact: true });
    this.가입하기 = page.getByRole('button', { name: /^(가입하기|처리 중)$/ });
    this.가입오류 = page.getByRole('alert');
    this.아이디오류 = page.getByText('아이디는 영문 소문자·숫자 4~12자입니다', { exact: true });
    this.비밀번호오류 = page.getByText('비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다', { exact: true });
    this.비밀번호확인오류 = page.getByText('비밀번호가 일치하지 않습니다', { exact: true });
    this.이름오류 = page.getByText('이름은 2~10자입니다', { exact: true });
    this.이메일오류 = page.getByText('이메일 형식이 올바르지 않습니다', { exact: true });
    this.휴대폰오류 = page.getByText('휴대폰 번호는 숫자 10~11자입니다', { exact: true });
    this.사용가능 = page.getByText('사용 가능한 아이디입니다', { exact: true });
    this.사용중 = page.getByText('이미 사용 중인 아이디입니다', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원가입화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.큰제목.waitFor();
    await this.아이디.waitFor();
    await this.머리.그려질때까지();
  }

  성별(이름: '선택 안 함' | '남성' | '여성'): Locator {
    return this.page.getByRole('radio', { name: 이름, exact: true });
  }

  관심분야(이름: '패션' | '전자기기' | '도서' | '식품'): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  약관동의(약관: 약관): Locator {
    if (약관 === '이용약관') return this.이용약관동의;
    if (약관 === '개인정보 수집') return this.개인정보동의;
    return this.마케팅동의;
  }

  약관보기(약관: 약관): Locator {
    return this.page.locator('.term').filter({ has: this.약관동의(약관) }).getByRole('button', { name: '보기', exact: true });
  }

  약관창(약관: 약관): 모달 {
    return new 모달(this.page, 약관 === '이용약관' ? '이용약관' : 약관 === '개인정보 수집' ? '개인정보 수집' : '마케팅 정보 수신');
  }

  관심분야그룹(): Locator {
    return this.page.getByRole('group', { name: '관심 분야 (최대 3개)' });
  }

  async 관심분야고른수(): Promise<number> {
    return this.관심분야그룹().getByRole('checkbox', { checked: true }).count();
  }

  async 이름표없는입력칸수(): Promise<number> {
    return this.page.evaluate(() => [...document.querySelectorAll('main input')].filter((칸) => (칸 as HTMLInputElement).labels?.length === 0 && !칸.getAttribute('aria-label')).length);
  }

  async 내린거리(): Promise<number> {
    return this.page.evaluate(() => Math.round(window.scrollY));
  }

  async 맨위로올리기(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await 두프레임기다리기(this.page);
  }

  async 화면이밀린만큼기다리기(): Promise<void> {
    await 두프레임기다리기(this.page);
    await 두프레임기다리기(this.page);
  }

  async 값길이(칸: Locator): Promise<number> {
    return 칸.evaluate((요소) => (요소 as HTMLInputElement).value.length);
  }

  async 칸종류(칸: Locator): Promise<string | null> {
    return 칸.getAttribute('type');
  }

  async 필수칸채우기(값: 가입값): Promise<void> {
    await this.아이디.fill(값.loginId);
    await this.비밀번호.fill(값.password);
    await this.비밀번호확인.fill(값.password);
    await this.이름.fill(값.name);
    await this.이메일.fill(값.email);
  }

  async 중복확인하기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/auth/check-id'));
    await this.중복확인.click();
    await 응답;
    await this.사용가능.or(this.사용중).waitFor();
  }

  async 필수약관동의(): Promise<void> {
    await this.이용약관동의.check();
    await this.개인정보동의.check();
  }

  async 가입요청보내기(): Promise<void> {
    await this.가입하기.click();
  }
}
