import type { Locator, Page } from '@playwright/test';

export class 회원탈퇴화면 {
  static readonly 주소 = '/my/withdraw';

  readonly 제목: Locator;
  readonly 메뉴: Locator;
  readonly 메뉴링크들: Locator;
  readonly 확인체크: Locator;
  readonly 탈퇴하기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원 탈퇴', level: 1 });
    this.메뉴 = page.getByRole('navigation', { name: '마이페이지 메뉴' });
    this.메뉴링크들 = this.메뉴.getByRole('link');
    this.확인체크 = page.getByRole('checkbox', { name: '위 내용을 확인했습니다' });
    this.탈퇴하기 = page.getByRole('button', { name: '탈퇴하기', exact: true });
  }

  메뉴링크(이름: string): Locator {
    return this.메뉴.getByRole('link', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원탈퇴화면.주소);
    await this.제목.waitFor();
  }

  확인창받기(처리: 'accept' | 'dismiss'): Promise<string> {
    return this.page.waitForEvent('dialog').then(async (창) => {
      const 문구 = 창.message();
      if (처리 === 'accept') await 창.accept();
      else await 창.dismiss();
      return 문구;
    });
  }
}
