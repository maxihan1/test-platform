import type { Locator, Page } from '@playwright/test';

export class 가입화면 {
  static readonly 주소 = '/auth/sign_up';

  readonly 사용자명: Locator;
  readonly 이메일: Locator;
  readonly 암호: Locator;
  readonly 암호다시: Locator;
  readonly 가입이유: Locator;
  readonly 동의: Locator;
  readonly 등록하기: Locator;
  readonly 오류안내: Locator;
  readonly 이메일확인안내: Locator;

  constructor(private readonly page: Page) {
    this.사용자명 = page.getByRole('textbox', { name: '사용자명' });
    this.이메일 = page.getByRole('textbox', { name: '이메일 주소' });
    this.암호 = page.getByRole('textbox', { name: '암호', exact: true });
    this.암호다시 = page.getByRole('textbox', { name: '암호 다시 입력' });
    this.가입이유 = page.getByRole('textbox', { name: '가입하려는 이유가 무엇인가요?' });
    this.동의 = page.getByRole('checkbox', { name: '개인정보처리방침을 읽었고 동의합니다' });
    this.등록하기 = page.getByRole('button', { name: /^(등록하기|가입 요청하기)$/ });
    this.오류안내 = page.locator('.flash-message, .error, .hint.error, span.error');
    this.이메일확인안내 = page.getByText('로 보낸 링크를 클릭해 마스토돈을 시작하세요');
  }

  async 열기(): Promise<void> {
    await this.page.goto(가입화면.주소);
    await this.등록하기.waitFor();
  }

  async 가입정보적기(아이디: string, 이메일: string, 암호: string, 이유?: string): Promise<void> {
    await this.사용자명.fill(아이디);
    await this.이메일.fill(이메일);
    await this.암호.fill(암호);
    await this.암호다시.fill(암호);
    if (이유 !== undefined && (await this.가입이유.count()) > 0) await this.가입이유.fill(이유);
    await this.동의.check();
  }

  async 등록하기누르기(양식을연시각: number): Promise<void> {
    await this.page.waitForFunction((시각) => Date.now() - 시각 >= 3500, 양식을연시각);
    await this.등록하기.click();
    await this.page.waitForLoadState('load');
  }

  가입됐는가(): boolean {
    return !new URL(this.page.url()).pathname.startsWith(가입화면.주소);
  }
}
