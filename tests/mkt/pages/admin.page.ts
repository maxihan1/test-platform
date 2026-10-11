import type { Locator, Page } from '@playwright/test';

export class 관리자화면 {
  static readonly 주소 = '/admin';

  readonly page: Page;
  readonly 권한없음제목: Locator;
  readonly 권한없음문구: Locator;
  readonly 회원표: Locator;
  readonly 회원총인원: Locator;
  readonly 아이디검색칸: Locator;
  readonly 회원줄들: Locator;
  readonly 배너줄들: Locator;
  readonly 첫배너제목: Locator;
  readonly 배너노출스위치들: Locator;
  readonly 배너저장버튼: Locator;
  readonly 홈공지팝업스위치: Locator;
  readonly 주문내역내려받기: Locator;
  readonly 홈배너슬라이드들: Locator;
  readonly 홈공지팝업: Locator;

  constructor(page: Page) {
    this.page = page;
    this.권한없음제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 1 });
    this.권한없음문구 = page.getByText('이 화면을 볼 수 있는 권한이 없습니다.');
    this.회원표 = page.locator('#user-scroll');
    this.회원총인원 = page.locator('#user-total');
    this.아이디검색칸 = page.getByLabel('아이디 검색');
    this.회원줄들 = this.회원표.locator('tr.u');
    this.배너줄들 = page.locator('#banner-list li');
    this.첫배너제목 = this.배너줄들.first().locator('.title');
    this.배너노출스위치들 = this.배너줄들.getByRole('switch', { name: '노출' });
    this.배너저장버튼 = page.getByRole('button', { name: '저장', exact: true });
    this.홈공지팝업스위치 = page.getByLabel('홈 공지 팝업');
    this.주문내역내려받기 = page.getByRole('button', { name: '주문 내역 내려받기' });
    this.홈배너슬라이드들 = page.getByRole('region', { name: '배너' }).getByRole('group');
    this.홈공지팝업 = page.getByRole('dialog', { name: '공지사항' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(관리자화면.주소);
  }

  탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름 });
  }

  회원열머리(이름: string): Locator {
    return this.회원표.getByRole('button', { name: new RegExp(`^${이름}`) });
  }

  회원줄(아이디: string): Locator {
    return this.회원줄들.filter({ hasText: 아이디 });
  }

  잠금해제버튼(아이디: string): Locator {
    return this.회원줄(아이디).getByRole('button', { name: '잠금 해제' });
  }

  정상상태칸(아이디: string): Locator {
    return this.회원줄(아이디).getByRole('cell', { name: '정상', exact: true });
  }

  배너(제목: string): Locator {
    return this.배너줄들.filter({ hasText: 제목 });
  }

  배너노출스위치(배너: Locator): Locator {
    return 배너.getByRole('switch', { name: '노출' });
  }

  async 배너제목들(): Promise<string[]> {
    return this.배너줄들.locator('.title').allInnerTexts();
  }

  async 홈배너제목들(): Promise<string[]> {
    return this.홈배너슬라이드들.getByRole('heading', { level: 2 }).allInnerTexts();
  }

  async 노출켜진배너제목들(): Promise<string[]> {
    return this.배너줄들.evaluateAll((줄들) =>
      줄들
        .filter((줄) => (줄.querySelector('input[type=checkbox]') as HTMLInputElement | null)?.checked)
        .map((줄) => (줄.querySelector('.title')?.textContent ?? '').trim()),
    );
  }

  async 노출켜진배너수(): Promise<number> {
    return this.배너줄들.getByRole('switch', { name: '노출' }).evaluateAll((칸들) => 칸들.filter((칸) => (칸 as HTMLInputElement).checked).length);
  }
}
