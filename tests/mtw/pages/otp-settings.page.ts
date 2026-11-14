import type { Locator, Page } from '@playwright/test';

export class 이단계인증설정화면 {
  static readonly 주소 = '/settings/otp_authentication';

  readonly 제목: Locator;
  readonly 설정시작: Locator;
  readonly 암호확인칸: Locator;
  readonly 암호확인계속: Locator;
  readonly 비밀코드: Locator;
  readonly 코드칸: Locator;
  readonly 활성화: Locator;
  readonly 비활성화: Locator;
  readonly 오류안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '2단계 인증', level: 1 });
    this.설정시작 = page.getByRole('link', { name: '설정', exact: true });
    this.암호확인칸 = page.getByRole('textbox', { name: '계속하려면 암호를 확인하세요' });
    this.암호확인계속 = page.getByRole('button', { name: '계속' });
    this.비밀코드 = page.locator('samp.qr-alternative__code');
    this.코드칸 = page.getByRole('textbox', { name: '이중 인증 코드' });
    this.활성화 = page.getByRole('button', { name: '활성화' });
    this.비활성화 = page.getByRole('link', { name: /비활성화|끄기|해제/ }).or(page.getByRole('button', { name: /비활성화|끄기|해제/ }));
    this.오류안내 = page.getByText('코드가 올바르지 않습니다! 서버와 휴대전화 간의 시각이 일치하나요?');
  }

  async 열기(): Promise<void> {
    await this.page.goto(이단계인증설정화면.주소);
    await this.제목.waitFor();
  }

  async 설정시작하기(암호: string): Promise<void> {
    await this.설정시작.click();
    await this.암호확인칸.fill(암호);
    await this.암호확인계속.click();
    await this.코드칸.waitFor();
  }

  async 비밀코드읽기(): Promise<string> {
    return (await this.비밀코드.innerText()).trim();
  }

  async 코드넣고활성화(코드: string): Promise<void> {
    await this.코드칸.fill(코드);
    await this.활성화.click();
  }

  async 끄기(): Promise<void> {
    await this.비활성화.click();
    await this.설정시작.waitFor();
  }
}
