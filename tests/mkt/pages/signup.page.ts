import type { Locator, Page } from '@playwright/test';

import type { 임시회원 } from '../components/account.component.js';

export type 칸이름 = 'loginId' | 'password' | 'passwordConfirm' | 'name' | 'email' | 'phone';
export type 약관이름 = '이용약관' | '개인정보 수집' | '마케팅 수신';

export class 회원가입화면 {
  readonly 제목: Locator;
  readonly 아이디칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 비밀번호확인칸: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 휴대폰칸: Locator;
  readonly 생년월일칸: Locator;
  readonly 중복확인버튼: Locator;
  readonly 눈버튼: Locator;
  readonly 가입하기버튼: Locator;
  readonly 전체동의: Locator;
  readonly 이용약관동의: Locator;
  readonly 개인정보동의: Locator;
  readonly 마케팅동의: Locator;
  readonly 성별묶음: Locator;
  readonly 관심분야묶음: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원가입', level: 1 });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.비밀번호칸 = page.getByLabel('비밀번호', { exact: true });
    this.비밀번호확인칸 = page.getByLabel('비밀번호 확인', { exact: true });
    this.이름칸 = page.getByLabel('이름', { exact: true });
    this.이메일칸 = page.getByLabel('이메일', { exact: true });
    this.휴대폰칸 = page.getByLabel('휴대폰', { exact: true });
    this.생년월일칸 = page.getByLabel('생년월일', { exact: true });
    this.중복확인버튼 = page.getByRole('button', { name: '중복 확인', exact: true });
    this.눈버튼 = page.getByRole('button', { name: '비밀번호 보기', exact: true });
    this.가입하기버튼 = page.getByRole('button', { name: '가입하기', exact: true });
    this.전체동의 = page.getByRole('checkbox', { name: '전체 동의', exact: true });
    this.이용약관동의 = page.getByRole('checkbox', { name: '(필수) 이용약관 동의', exact: true });
    this.개인정보동의 = page.getByRole('checkbox', { name: '(필수) 개인정보 수집 동의', exact: true });
    this.마케팅동의 = page.getByRole('checkbox', { name: '(선택) 마케팅 수신 동의', exact: true });
    this.성별묶음 = page.getByRole('group', { name: '성별' });
    this.관심분야묶음 = page.getByRole('group', { name: '관심 분야 (최대 3개)' });
  }

  오류문구(키: 칸이름): Locator {
    return this.page.locator(`.msg[data-for="${키}"]`);
  }

  성별(이름: string): Locator {
    return this.성별묶음.getByRole('radio', { name: 이름, exact: true });
  }

  관심분야(이름: string): Locator {
    return this.관심분야묶음.getByRole('checkbox', { name: 이름, exact: true });
  }

  약관보기버튼(약관: 약관이름): Locator {
    return this.page
      .locator('.term')
      .filter({ has: this.page.getByRole('checkbox', { name: new RegExp(`${약관}`) }) })
      .getByRole('button', { name: '보기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/signup');
    await this.제목.waitFor();
    await this.비밀번호칸.waitFor();
  }

  async 칸벗어나기(칸: Locator): Promise<void> {
    await 칸.blur();
  }

  async 필수칸채우기(회원: 임시회원): Promise<void> {
    await this.아이디칸.fill(회원.loginId);
    await this.비밀번호칸.fill(회원.password);
    await this.비밀번호확인칸.fill(회원.password);
    await this.이름칸.fill(회원.name);
    await this.이메일칸.fill(회원.email);
  }

  async 중복확인하기(): Promise<void> {
    await this.중복확인버튼.click();
    await this.오류문구('loginId')
      .filter({ hasText: /사용 (가능한|중인) 아이디입니다/ })
      .waitFor();
  }

  async 필수약관켜기(): Promise<void> {
    await this.이용약관동의.check();
    await this.개인정보동의.check();
  }

  async 가입하기누르기(): Promise<void> {
    await this.가입하기버튼.click();
  }

  async 오류문구글자색(키: 칸이름): Promise<string> {
    return this.오류문구(키).evaluate((el) => getComputedStyle(el).color);
  }

  async 칸아래에있나(키: 칸이름, 칸: Locator): Promise<boolean> {
    const 칸상자 = await 칸.boundingBox();
    const 문구상자 = await this.오류문구(키).boundingBox();
    if (!칸상자 || !문구상자) return false;
    return 문구상자.y >= 칸상자.y + 칸상자.height - 1;
  }

  async 눈버튼이칸오른쪽에있나(): Promise<boolean> {
    const 칸상자 = await this.비밀번호칸.boundingBox();
    const 눈상자 = await this.눈버튼.boundingBox();
    if (!칸상자 || !눈상자) return false;
    return 눈상자.x + 눈상자.width / 2 > 칸상자.x + 칸상자.width / 2;
  }
}
