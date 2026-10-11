import type { Locator, Page } from '@playwright/test';

export type 가입칸 = 'loginId' | 'password' | 'passwordConfirm' | 'name' | 'email' | 'phone';

export interface 가입값 {
  아이디: string;
  비밀번호: string;
  이름: string;
  이메일: string;
  휴대폰: string;
}

export class 회원가입화면 {
  static readonly 주소 = '/signup';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 아이디칸: Locator;
  readonly 중복확인버튼: Locator;
  readonly 비밀번호칸: Locator;
  readonly 눈버튼: Locator;
  readonly 비밀번호확인칸: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 휴대폰칸: Locator;
  readonly 생년월일칸: Locator;
  readonly 성별: Locator;
  readonly 관심분야: Locator;
  readonly 전체동의: Locator;
  readonly 가입하기버튼: Locator;
  readonly 제출오류: Locator;
  readonly 모달닫힘: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '회원가입', level: 1 });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.중복확인버튼 = page.getByRole('button', { name: '중복 확인' });
    this.비밀번호칸 = page.getByLabel('비밀번호', { exact: true });
    this.눈버튼 = page.getByRole('button', { name: '비밀번호 보기' });
    this.비밀번호확인칸 = page.getByLabel('비밀번호 확인', { exact: true });
    this.이름칸 = page.getByLabel('이름', { exact: true });
    this.이메일칸 = page.getByLabel('이메일', { exact: true });
    this.휴대폰칸 = page.getByLabel('휴대폰', { exact: true });
    this.생년월일칸 = page.getByLabel('생년월일', { exact: true });
    this.성별 = page.getByRole('group', { name: '성별' });
    this.관심분야 = page.getByRole('group', { name: /^관심 분야/ });
    this.전체동의 = page.getByRole('checkbox', { name: '전체 동의' });
    this.가입하기버튼 = page.getByRole('button', { name: '가입하기' });
    this.제출오류 = page.locator('p.submit-error');
    this.모달닫힘 = page.locator('body:not(.no-scroll)');
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원가입화면.주소);
    await this.제목.waitFor();
  }

  안내문구(칸: 가입칸): Locator {
    return this.page.locator(`p.msg[data-for="${칸}"]`);
  }

  성별라디오(이름: string): Locator {
    return this.성별.getByRole('radio', { name: 이름, exact: true });
  }

  관심체크(이름: string): Locator {
    return this.관심분야.getByRole('checkbox', { name: 이름, exact: true });
  }

  약관체크(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  약관보기버튼(이름: string): Locator {
    return this.page.locator('.terms-box .term').filter({ hasText: 이름 }).getByRole('button', { name: '보기' });
  }

  async 관심분야이름들(): Promise<string[]> {
    return this.관심분야.getByRole('checkbox').evaluateAll((칸들) =>
      칸들.map((칸) => (칸 as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''),
    );
  }

  async 골라진관심분야(): Promise<string[]> {
    return this.관심분야.getByRole('checkbox').evaluateAll((칸들) =>
      칸들.filter((칸) => (칸 as HTMLInputElement).checked).map((칸) => (칸 as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''),
    );
  }

  async 필수칸채우기(값: 가입값): Promise<void> {
    await this.아이디칸.fill(값.아이디);
    await this.비밀번호칸.fill(값.비밀번호);
    await this.비밀번호확인칸.fill(값.비밀번호);
    await this.이름칸.fill(값.이름);
    await this.이메일칸.fill(값.이메일);
    await this.휴대폰칸.fill(값.휴대폰);
  }

  async 아이디확인하기(): Promise<void> {
    await this.중복확인버튼.click();
    await this.안내문구('loginId').filter({ hasText: '사용 가능한 아이디입니다' }).waitFor();
  }

  async 중복확인누르기(): Promise<void> {
    await this.중복확인버튼.click();
    await this.안내문구('loginId').filter({ hasText: /사용/ }).waitFor();
  }

  async 필수약관동의(): Promise<void> {
    await this.약관체크('(필수) 이용약관 동의').check();
    await this.약관체크('(필수) 개인정보 수집 동의').check();
  }

  async 모두채우기(값: 가입값): Promise<void> {
    await this.필수칸채우기(값);
    await this.아이디확인하기();
    await this.필수약관동의();
  }

  async 빨간글자인가(칸: 가입칸): Promise<boolean> {
    const 색 = await this.안내문구(칸).evaluate((글) => getComputedStyle(글).color);
    const [붉음, 초록, 파랑] = 색숫자들(색);
    return 붉음 >= 200 && 초록 <= 80 && 파랑 <= 80;
  }

  async 이름표없는칸들(): Promise<string[]> {
    return this.page.getByRole('main').locator('input').evaluateAll((칸들) =>
      칸들
        .filter((칸) => ((칸 as HTMLInputElement).labels?.length ?? 0) === 0)
        .map((칸) => (칸 as HTMLInputElement).dataset.k ?? (칸 as HTMLInputElement).type),
    );
  }
}

function 색숫자들(색: string): number[] {
  const 숫자 = 색.match(/\d+(\.\d+)?/g) ?? [];
  return 숫자.slice(0, 3).map(Number);
}
