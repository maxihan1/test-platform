import type { Locator, Page } from '@playwright/test';

export class 이용약관초안화면 {
  static readonly 주소 = '/admin/terms_of_service/draft';

  readonly 제목: Locator;
  readonly 약관칸: Locator;
  readonly 변경내용칸: Locator;
  readonly 시행일: Locator;
  readonly 시행연도: Locator;
  readonly 시행월: Locator;
  readonly 시행일자: Locator;
  readonly 초안저장: Locator;
  readonly 게시: Locator;
  readonly 오류안내: Locator;
  readonly 칸오류들: Locator;
  readonly 너무이름: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '이용 약관', level: 1 });
    this.약관칸 = page.getByRole('textbox', { name: '이용 약관' });
    this.변경내용칸 = page.getByRole('textbox', { name: '무엇이 바뀌었나요?' });
    this.시행일 = page.getByText('시행일', { exact: true });
    this.시행연도 = page.getByRole('combobox', { name: '시행일' });
    this.시행월 = page.getByRole('main').getByRole('combobox').nth(1);
    this.시행일자 = page.getByRole('main').getByRole('combobox').nth(2);
    this.초안저장 = page.getByRole('button', { name: '초안 저장' });
    this.게시 = page.getByRole('button', { name: '게시', exact: true });
    this.오류안내 = page.locator('.flash-message').filter({ hasText: /^\s*오류가 발생했습니다/ });
    this.칸오류들 = page.locator('.error');
    this.너무이름 = page.getByText(/^너무 이릅니다\./);
  }

  async 열기(): Promise<void> {
    await this.page.goto(이용약관초안화면.주소);
    await this.초안저장.waitFor();
  }

  async 시행일적기(날짜: Date): Promise<void> {
    await this.시행연도.selectOption(String(날짜.getFullYear()));
    await this.시행월.selectOption(String(날짜.getMonth() + 1));
    await this.시행일자.selectOption(String(날짜.getDate()));
  }
}
