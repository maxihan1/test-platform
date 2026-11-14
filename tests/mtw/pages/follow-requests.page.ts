import type { Locator, Page } from '@playwright/test';

export class 팔로우요청화면 {
  static readonly 주소 = '/follow_requests';

  readonly 제목: Locator;
  readonly 요청들: Locator;
  readonly 빈안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '팔로우 요청', level: 1 });
    this.요청들 = page.getByRole('main').getByRole('article');
    this.빈안내 = page.getByText('아직 팔로우 요청이 없습니다. 요청을 받았을 때 여기에 나타납니다.');
  }

  async 열기(): Promise<void> {
    await this.page.goto(팔로우요청화면.주소);
    await this.제목.waitFor();
  }

  요청(아이디: string): Locator {
    return this.요청들.filter({ hasText: `@${아이디}` });
  }

  승인(아이디: string): Locator {
    return this.요청(아이디).getByRole('button', { name: '승인' });
  }

  거부(아이디: string): Locator {
    return this.요청(아이디).getByRole('button', { name: '거부' });
  }

  async 목록그려질때까지(): Promise<void> {
    await this.빈안내.or(this.요청들.first()).waitFor();
  }

  async 승인하기(아이디: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => /\/follow_requests\/\d+\/authorize$/.test(r.url()) && r.request().method() === 'POST');
    await this.승인(아이디).click();
    await 응답;
  }

  async 거부하기(아이디: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => /\/follow_requests\/\d+\/reject$/.test(r.url()) && r.request().method() === 'POST');
    await this.거부(아이디).click();
    await 응답;
  }
}
