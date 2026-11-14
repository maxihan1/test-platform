import type { Locator, Page, Request } from '@playwright/test';

export class 리스트만들기화면 {
  static readonly 주소 = '/lists/new';

  readonly 제목: Locator;
  readonly 이름칸: Locator;
  readonly 새이름라벨: Locator;
  readonly 답글선택: Locator;
  readonly 홈에서숨기기: Locator;
  readonly 만들기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '리스트 만들기', level: 1 });
    this.이름칸 = page.getByRole('main').getByRole('textbox', { name: '리스트 이름' });
    this.새이름라벨 = page.getByRole('main').getByRole('textbox', { name: '새 리스트 이름' });
    this.답글선택 = page.getByRole('main').getByRole('combobox', { name: /답글/ });
    this.홈에서숨기기 = page.getByRole('main').getByRole('checkbox', { name: /구성원을 홈에서 숨기기/ });
    this.만들기 = page.getByRole('main').getByRole('button', { name: '만들기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(리스트만들기화면.주소);
    await this.이름칸.waitFor();
  }

  async 이름넣기(이름: string): Promise<void> {
    await this.이름칸.fill(이름);
  }

  async 만들기누르기(): Promise<void> {
    await this.만들기.click({ noWaitAfter: true });
  }

  async 빠르게두번누르기(): Promise<void> {
    const 응답들: Promise<unknown>[] = [];
    const 듣기 = (요청: Request): void => {
      if (요청.method() === 'POST' && /\/api\/v1\/lists$/.test(요청.url())) 응답들.push(요청.response());
    };
    this.page.on('request', 듣기);
    await this.만들기.dblclick({ noWaitAfter: true });
    await this.화면다시그려질때까지();
    this.page.off('request', 듣기);
    await Promise.all(응답들);
  }

  async 한도오류떴나(): Promise<boolean> {
    return this.page.waitForFunction(() => document.body.innerText.includes('리스트 최대 개수를 초과합니다'), undefined, { timeout: 10_000 }).then(() => true, () => false);
  }

  async 화면다시그려질때까지(): Promise<void> {
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }
}
