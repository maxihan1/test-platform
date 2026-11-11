import type { Locator, Page } from '@playwright/test';

export class 릴레이화면 {
  static readonly 주소 = '/admin/relays';

  readonly 제목: Locator;
  readonly 설명: Locator;
  readonly 연결설정: Locator;
  readonly 보안모드경고: Locator;
  readonly 표: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '릴레이', level: 1, exact: true });
    this.설명 = page.getByText('는 서버들 사이에서 많은 양의 공개 게시물을 구독하고 중개하는 서버입니다.');
    this.연결설정 = page.getByRole('link', { name: '릴레이 연결 설정' });
    this.보안모드경고 = page.getByText('시큐어모드나 제한된 페더레이션 모드를 사용하고 있다면 릴레이는 제대로 동작하지 않을 것입니다');
    this.표 = page.getByRole('table');
  }

  async 열기(): Promise<number> {
    const 응답 = await this.page.goto(릴레이화면.주소);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }
}
