import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 암호와보안화면 {
  static readonly 주소 = '/auth/edit';

  readonly 틀: 설정틀;
  readonly 제목: Locator;
  readonly 이메일칸: Locator;
  readonly 현재암호칸: Locator;
  readonly 새암호칸: Locator;
  readonly 암호확인칸: Locator;
  readonly 칸오류: Locator;
  readonly 오류요약: Locator;
  readonly 세션삭제: Locator;
  readonly 세션삭제안내: Locator;
  readonly 확인대기안내: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.제목 = page.getByRole('heading', { name: '계정 설정', level: 1 });
    this.이메일칸 = page.getByRole('textbox', { name: '이메일 주소' });
    this.현재암호칸 = page.getByRole('textbox', { name: '현재 암호 입력' });
    this.새암호칸 = page.getByRole('textbox', { name: '새로운 암호 입력' });
    this.암호확인칸 = page.getByRole('textbox', { name: '암호 다시 입력' });
    this.칸오류 = page.locator('.field_with_errors .error');
    this.오류요약 = page.getByText('오류가 발생했습니다. 아래 1개 오류를 확인해 주십시오', { exact: true });
    this.세션삭제 = page.getByRole('table').getByRole('link', { name: '삭제' });
    this.세션삭제안내 = page.getByText('세션을 성공적으로 취소하였습니다');
    this.확인대기안내 = page.getByText(/새 이메일 주소|새로운 이메일 주소|이메일 주소를 확인/);
  }

  async 열기(): Promise<void> {
    await this.page.goto(암호와보안화면.주소);
    await this.틀.저장.waitFor();
  }

  async 저장하기(): Promise<void> {
    await this.틀.저장.click();
  }

  async 이메일바꾸고저장(새이메일: string, 현재암호: string): Promise<void> {
    await this.이메일칸.fill(새이메일);
    await this.현재암호칸.fill(현재암호);
    await this.저장하기();
  }

  async 암호바꾸고저장(현재암호: string, 새암호: string): Promise<void> {
    await this.새암호칸.fill(새암호);
    await this.암호확인칸.fill(새암호);
    await this.현재암호칸.fill(현재암호);
    await this.저장하기();
  }

  async 새암호치기(값: string): Promise<void> {
    await this.새암호칸.fill('');
    await this.새암호칸.click();
    await this.새암호칸.pressSequentially(값);
  }

  async 글자수(칸: Locator): Promise<number> {
    return 칸.evaluate((요소) => (요소 as HTMLInputElement).value.length);
  }
}
