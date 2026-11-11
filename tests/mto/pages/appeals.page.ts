import type { Locator, Page } from '@playwright/test';

export class 이의제기화면 {
  static readonly 주소 = '/admin/disputes/appeals';

  readonly 제목: Locator;
  readonly 대기중: Locator;
  readonly 승인됨: Locator;
  readonly 거부됨: Locator;
  readonly 비어있음: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '이의제기', level: 1, exact: true });
    this.대기중 = page.getByRole('link', { name: /^대기 중 \(\d+\)$/ });
    this.승인됨 = page.getByRole('link', { name: '승인됨', exact: true });
    this.거부됨 = page.getByRole('link', { name: '거부됨', exact: true });
    this.비어있음 = page.getByText('이의제기 없음.');
  }

  async 열기(조건 = ''): Promise<void> {
    await this.page.goto(`${이의제기화면.주소}${조건 ? `?${조건}` : ''}`);
    await this.제목.waitFor();
    await this.대기중.waitFor();
  }

  줄(계정: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(`님이 ${계정}에게`) });
  }

  처벌내용(계정: string): Locator {
    return this.줄(계정).getByText(new RegExp(`님이 ${계정}에게 .+ 보냈습니다`));
  }

  날짜(계정: string): Locator {
    return this.줄(계정).locator('time');
  }

  대기표시(계정: string): Locator {
    return this.줄(계정).getByText('이의제기 대기중');
  }

  async 승인됨누르기(): Promise<void> {
    await this.승인됨.click();
    await this.page.waitForURL(/status=approved/);
    await this.제목.waitFor();
  }
}
