import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 계정설정화면 {
  static readonly 주소 = '/settings/{화면}';

  readonly 틀: 설정틀;
  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
  }

  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
    await this.제목.waitFor();
  }

  글(문구: string | RegExp): Locator {
    return this.page.getByRole('main').getByText(문구).first();
  }

  소제목(이름: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('heading', { name: 이름 }).first();
  }

  칸(이름: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('textbox', { name: 이름 }).or(this.page.getByRole('main').getByRole('combobox', { name: 이름 })).first();
  }

  체크(이름: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('checkbox', { name: 이름 }).first();
  }

  버튼(이름: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 이름 }).first();
  }

  링크(이름: string | RegExp): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 이름 }).first();
  }

  필터링크(이름: string): Locator {
    return this.page.getByRole('main').getByRole('link', { name: 이름, exact: true });
  }

  파일칸(): Locator {
    return this.page.getByRole('main').locator('input[type="file"]');
  }

  async 고르기(이름: string | RegExp, 값: string): Promise<void> {
    await this.page.getByRole('main').getByRole('combobox', { name: 이름 }).selectOption({ label: 값 });
  }

  async 가져오기양식보내기(종류값: string, 파일: { name: string; mimeType: string; buffer: Buffer }): Promise<{ 주소: string; 글: string }> {
    await this.열기('/settings/imports');
    const 토큰 = await this.page.locator('main form input[name="authenticity_token"]').first().inputValue();
    const 응답 = await this.page.request.post('/settings/imports', {
      multipart: { authenticity_token: 토큰, 'form_import[type]': 종류값, 'form_import[mode]': 'merge', 'form_import[data]': 파일 },
      headers: { 'Accept-Language': 'ko-KR,ko;q=0.9' },
    });
    return { 주소: new URL(응답.url()).pathname, 글: await 응답.text() };
  }

  async 누르고기다리기(이름: string | RegExp, 끝: Locator): Promise<boolean> {
    await this.버튼(이름).click();
    return 끝.first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
  }

  async 보내기(이름: string | RegExp): Promise<void> {
    await this.버튼(이름).click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.제목.waitFor();
  }
}
