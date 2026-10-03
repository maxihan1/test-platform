import type { Locator, Page } from '@playwright/test';

export class 관리자화면 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '관리자' });
  }

  get 권한없음제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '권한이 없습니다' });
  }

  탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  get 회원목록영역(): Locator {
    return this.page.getByLabel('회원 목록');
  }

  get 회원표(): Locator {
    return this.회원목록영역.getByRole('table');
  }

  get 칸제목들(): Locator {
    return this.회원표.getByRole('columnheader');
  }

  칸제목(이름: string): Locator {
    return this.칸제목들.getByRole('button', { name: new RegExp(`^${이름}`) });
  }

  get 총인원(): Locator {
    return this.page.getByText(/^총 \d+명$/);
  }

  get 아이디검색(): Locator {
    return this.page.getByRole('searchbox', { name: '아이디 검색' });
  }

  get 아이디칸들(): Locator {
    return this.회원목록영역.locator('tr.u td:first-child');
  }

  회원줄(아이디: string): Locator {
    return this.회원표.getByRole('row').filter({ has: this.page.getByRole('cell', { name: 아이디, exact: true }) });
  }

  잠금해제(아이디: string): Locator {
    return this.회원줄(아이디).getByRole('button', { name: '잠금 해제' });
  }

  get 배너관리패널(): Locator {
    return this.page.getByRole('tabpanel', { name: '배너 관리' });
  }

  get 배너줄들(): Locator {
    return this.배너관리패널.getByRole('listitem');
  }

  배너줄(제목: string): Locator {
    return this.배너줄들.filter({ hasText: 제목 });
  }

  get 배너제목들(): Locator {
    return this.배너줄들.locator('.title');
  }

  노출스위치(제목: string): Locator {
    return this.배너줄(제목).getByRole('switch', { name: '노출' });
  }

  배너위로(제목: string): Locator {
    return this.배너관리패널.getByRole('button', { name: `${제목} 위로`, exact: true });
  }

  배너아래로(제목: string): Locator {
    return this.배너관리패널.getByRole('button', { name: `${제목} 아래로`, exact: true });
  }

  get 배너저장(): Locator {
    return this.배너관리패널.getByRole('button', { name: '저장', exact: true });
  }

  get 공지스위치(): Locator {
    return this.page.getByRole('switch', { name: '홈 공지 팝업' });
  }

  get 주문내려받기(): Locator {
    return this.page.getByRole('link', { name: '주문 내역 내려받기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/admin');
    await this.탭('회원 관리').waitFor();
    await this.아이디칸들.first().waitFor();
  }

  async 배너관리를연다(): Promise<void> {
    await this.탭('배너 관리').click();
    await this.배너줄들.first().waitFor();
  }

  async 설정탭을연다(): Promise<void> {
    await this.탭('설정 · 내보내기').click();
    await this.공지스위치.waitFor();
    await this.page.waitForFunction(() => (document.querySelector('input[data-k="noticePopup"]') as HTMLInputElement | null)?.disabled === false);
  }

  async 회원목록을내린다(세로: number): Promise<void> {
    await this.회원목록영역.evaluate((요소, y) => {
      요소.scrollTop = y;
    }, 세로);
  }

  async 첫아이디가바뀔때까지기다린다(처음: string): Promise<boolean> {
    return this.page
      .waitForFunction((값) => document.querySelector('tr.u td:first-child')?.textContent !== 값, 처음, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
  }

  async 회원목록영역높이(): Promise<number> {
    const 상자 = await this.회원목록영역.boundingBox();
    return Math.round(상자?.height ?? 0);
  }
}
