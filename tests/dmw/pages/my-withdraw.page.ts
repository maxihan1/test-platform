import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  static readonly 주소 = '/my/withdraw';

  readonly 큰제목: Locator;
  readonly 안내제목: Locator;
  readonly 확인체크: Locator;
  readonly 탈퇴하기: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '회원 탈퇴' });
    this.안내제목 = page.getByRole('heading', { level: 2, name: '탈퇴 전에 꼭 확인하세요' });
    this.확인체크 = page.getByRole('checkbox', { name: '위 내용을 확인했습니다' });
    this.탈퇴하기 = page.getByRole('button', { name: '탈퇴하기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원탈퇴화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.안내제목.waitFor();
    await this.탈퇴하기.waitFor();
  }

  async 탈퇴하기누르고_확인창에(답: '확인' | '취소'): Promise<string> {
    const 창 = this.page.waitForEvent('dialog');
    const 눌림 = this.탈퇴하기.click();
    const 받은 = await 창;
    const 글 = 받은.message();
    if (답 === '확인') await 받은.accept();
    else await 받은.dismiss();
    await 눌림;
    return 글;
  }
}
