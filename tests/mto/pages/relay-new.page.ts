import type { Locator, Page } from '@playwright/test';

export class 릴레이추가화면 {
  static readonly 주소 = '/admin/relays/new';

  readonly 제목: Locator;
  readonly 주소칸: Locator;
  readonly 저장하고활성화: Locator;
  readonly 활성화설명: Locator;
  readonly 오류요약: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '릴레이 추가', level: 1 });
    this.주소칸 = page.getByRole('textbox', { name: '릴레이 서버의 inbox URL' });
    this.저장하고활성화 = page.getByRole('button', { name: '저장하고 활성화' });
    this.활성화설명 = page.getByText('활성화 되면, 이 릴레이의 모든 공개 게시물을 구독하고 이 서버의 공개 게시물을 전송하게 됩니다.');
    this.오류요약 = page.getByText('오류가 발생했습니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(릴레이추가화면.주소);
    await this.제목.waitFor();
    await this.저장하고활성화.waitFor();
  }

  async 저장하기(주소: string): Promise<void> {
    await this.주소칸.fill(주소);
    await this.저장하고활성화.click();
    await this.page.waitForLoadState('load');
  }
}
