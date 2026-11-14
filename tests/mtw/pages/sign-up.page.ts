import type { Locator, Page } from '@playwright/test';

export class 가입화면 {
  static readonly 주소 = '/auth/sign_up';

  readonly 제목: Locator;
  readonly 단계표시줄: Locator;
  readonly 머리로고: Locator;
  readonly 사용자명칸: Locator;
  readonly 도메인표시: Locator;
  readonly 사용자명힌트: Locator;
  readonly 이메일칸: Locator;
  readonly 암호칸: Locator;
  readonly 암호확인칸: Locator;
  readonly 동의칸: Locator;
  readonly 개인정보처리방침: Locator;
  readonly 등록하기: Locator;
  readonly 봇방지암호칸: Locator;
  readonly 봇방지사이트칸: Locator;
  readonly 가입사유칸: Locator;
  readonly 생년월일칸: Locator;
  readonly 상단오류: Locator;
  readonly 서버오류화면: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'mastodon.maxihan.com에 가입하기 위한 정보들을 입력하세요.' });
    this.단계표시줄 = page.getByRole('list', { name: '가입 절차' });
    this.머리로고 = page.getByRole('banner').getByRole('link', { name: 'Mastodon' });
    this.사용자명칸 = page.getByRole('textbox', { name: '사용자명' });
    this.도메인표시 = page.getByText('@mastodon.maxihan.com', { exact: true });
    this.사용자명힌트 = page.getByText('문자, 숫자, 밑줄을 사용할 수 있습니다', { exact: true });
    this.이메일칸 = page.getByRole('textbox', { name: '이메일 주소' });
    this.암호칸 = page.getByRole('textbox', { name: '암호', exact: true });
    this.암호확인칸 = page.getByRole('textbox', { name: '암호 다시 입력' });
    this.동의칸 = page.getByRole('checkbox', { name: /개인정보처리방침/ });
    this.개인정보처리방침 = page.getByRole('link', { name: '개인정보처리방침' });
    this.등록하기 = page.getByRole('button', { name: '등록하기' });
    this.봇방지암호칸 = page.getByPlaceholder('암호 (채우지 마시오)');
    this.봇방지사이트칸 = page.getByPlaceholder('Website (채우지 마시오)');
    this.가입사유칸 = page.getByLabel(/가입 사유|가입 이유|신청 사유/);
    this.생년월일칸 = page.getByLabel(/생년월일|생일/);
    this.상단오류 = page.getByText(/오류가 발생했습니다\. 아래 \d+개 오류를 확인해 주십시오/);
    this.서버오류화면 = page.getByRole('heading', { name: /something went wrong|문제가 발생/ });
  }

  단계(이름: string): Locator {
    return this.단계표시줄.getByRole('listitem').filter({ hasText: 이름 });
  }

  칸오류(칸: Locator): Locator {
    return this.page.locator('.field_with_errors').filter({ has: 칸 }).locator('.error');
  }

  async 사용자명넣기(값: string): Promise<void> {
    const 조회 = this.page.waitForResponse((응답) => 응답.url().includes('/api/v1/accounts/lookup'), { timeout: 5_000 }).catch(() => null);
    await this.사용자명칸.fill(값);
    await 조회;
  }

  async 채우기(값: { 사용자명: string; 이메일: string; 암호: string; 암호확인?: string }): Promise<void> {
    await this.사용자명넣기(값.사용자명);
    await this.이메일칸.fill(값.이메일);
    await this.암호칸.fill(값.암호);
    await this.암호확인칸.fill(값.암호확인 ?? 값.암호);
  }

  async 사용자명치기(값: string): Promise<void> {
    await this.사용자명칸.fill('');
    await this.사용자명칸.click();
    await this.사용자명칸.pressSequentially(값);
  }

  async 암호치기(값: string): Promise<void> {
    await this.암호칸.fill('');
    await this.암호칸.click();
    await this.암호칸.pressSequentially(값);
  }

  async 글자수(칸: Locator): Promise<number> {
    return 칸.evaluate((요소) => (요소 as HTMLInputElement).value.length);
  }

  async 필수인가(칸: Locator): Promise<boolean> {
    return 칸.evaluate((요소) => (요소 as HTMLInputElement).required);
  }

  async 브라우저안내(칸: Locator): Promise<string> {
    return 칸.evaluate((요소) => (요소 as HTMLInputElement).validationMessage);
  }

  async 누르기(): Promise<void> {
    await this.등록하기.click();
  }

  async 누르고나간요청수(): Promise<number> {
    let 수 = 0;
    const 세기 = (요청: { method(): string }): void => {
      if (요청.method() === 'POST') 수 += 1;
    };
    this.page.on('request', 세기);
    try {
      await this.등록하기.click();
      await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
    } finally {
      this.page.off('request', 세기);
    }
    return 수;
  }

  async 방침링크눌러열린창주소(): Promise<string> {
    const 새창 = this.page.waitForEvent('popup');
    await this.개인정보처리방침.click();
    const 열린창 = await 새창;
    await 열린창.waitForLoadState('domcontentloaded');
    const 주소 = new URL(열린창.url()).pathname;
    await 열린창.close();
    return 주소;
  }

  async 빠르게채우기(값: { 사용자명: string; 이메일: string; 암호: string }): Promise<void> {
    await this.사용자명칸.fill(값.사용자명);
    await this.이메일칸.fill(값.이메일);
    await this.암호칸.fill(값.암호);
    await this.암호확인칸.fill(값.암호);
  }

  async 초대링크로열기(경로: string): Promise<void> {
    await this.page.goto(경로);
    await this.등록하기.waitFor();
  }

  async 오른쪽에있는가(): Promise<boolean> {
    const 칸 = await this.사용자명칸.boundingBox();
    const 표시 = await this.도메인표시.boundingBox();
    if (칸 === null || 표시 === null) return false;
    return 표시.x >= 칸.x + 칸.width / 2;
  }

  async 동의하기(): Promise<void> {
    await this.동의칸.check();
  }

  안내(문구: string): Locator {
    return this.page.getByText(문구);
  }

  async 칸오류글(칸: Locator): Promise<string> {
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
    const 서버오류 = this.칸오류(칸);
    if ((await 서버오류.count()) > 0) return (await 서버오류.first().innerText()).trim();
    return this.브라우저안내(칸);
  }

  async 제출결과기다리기(): Promise<void> {
    await this.상단오류.or(this.서버오류화면).waitFor();
  }
}
