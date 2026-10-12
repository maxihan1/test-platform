import type { Download, Locator, Page } from '@playwright/test';

export class 관리자화면 {
  static readonly 주소 = '/admin';

  readonly 탭목록: Locator;
  readonly 회원관리탭: Locator;
  readonly 배너관리탭: Locator;
  readonly 회원표영역: Locator;
  readonly 회원표: Locator;
  readonly 회원줄들: Locator;
  readonly 회원열머리들: Locator;
  readonly 잠긴회원줄: Locator;
  readonly 정상회원줄: Locator;
  readonly 총인원: Locator;
  readonly 아이디검색: Locator;
  readonly 배너목록: Locator;
  readonly 배너줄들: Locator;
  readonly 배너저장: Locator;
  readonly 공지팝업스위치: Locator;
  readonly 주문내려받기: Locator;
  readonly 홈배너제목들: Locator;
  readonly 홈공지창: Locator;
  readonly 노출오류: Locator;
  readonly 켜진노출스위치들: Locator;

  constructor(readonly page: Page) {
    this.탭목록 = page.getByRole('tablist');
    this.회원관리탭 = page.getByRole('tab', { name: '회원 관리' });
    this.배너관리탭 = page.getByRole('tab', { name: '배너 관리' });
    this.회원표영역 = page.locator('#user-scroll');
    this.회원표 = this.회원표영역.getByRole('table');
    this.회원줄들 = this.회원표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.회원열머리들 = this.회원표.getByRole('columnheader');
    this.잠긴회원줄 = this.회원줄들.filter({ has: page.getByRole('button', { name: '잠금 해제' }) });
    this.정상회원줄 = this.회원줄들.filter({ hasNotText: '잠김' });
    this.총인원 = page.getByText(/^총 [\d,]+명$/);
    this.아이디검색 = page.getByLabel('아이디 검색');
    this.배너목록 = page.locator('#banner-list');
    this.배너줄들 = this.배너목록.getByRole('listitem');
    this.배너저장 = page.getByRole('button', { name: '저장', exact: true });
    this.공지팝업스위치 = page.getByRole('switch', { name: '홈 공지 팝업' });
    this.주문내려받기 = page.getByRole('button', { name: '주문 내역 내려받기' });
    this.홈배너제목들 = page.getByRole('region', { name: '배너' }).getByRole('heading', { level: 2 });
    this.홈공지창 = page.getByRole('dialog', { name: '공지사항' });
    this.노출오류 = page.getByText('배너를 하나 이상 노출해야 합니다');
    this.켜진노출스위치들 = this.배너줄들.getByRole('switch', { name: '노출', checked: true });
  }

  열머리(이름: string): Locator {
    return this.회원표.getByRole('columnheader', { name: new RegExp(`^${이름}`) });
  }

  회원줄(아이디: string): Locator {
    return this.회원줄들.filter({ has: this.page.getByRole('cell', { name: 아이디, exact: true }) });
  }

  배너노출스위치(줄: Locator): Locator {
    return 줄.getByRole('switch', { name: '노출' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(관리자화면.주소);
    await this.탭목록.waitFor();
  }

  async 회원아이디들(): Promise<string[]> {
    return this.회원줄들.evaluateAll((줄들) => 줄들.map((줄) => (줄.querySelector('td')?.textContent ?? '').trim()));
  }

  async 스크롤영역크기(): Promise<{ 높이: number; 전체: number }> {
    return this.회원표영역.evaluate((칸) => ({ 높이: 칸.clientHeight, 전체: 칸.scrollHeight }));
  }

  async 배너제목들(): Promise<string[]> {
    return this.배너줄들.evaluateAll((줄들) => 줄들.map((줄) => (줄.querySelector('.title')?.textContent ?? '').trim()));
  }

  async 노출배너제목들(): Promise<string[]> {
    const 켜진줄 = this.배너줄들.filter({ has: this.page.getByRole('switch', { name: '노출', checked: true }) });
    return 켜진줄.evaluateAll((줄들) => 줄들.map((줄) => (줄.querySelector('.title')?.textContent ?? '').trim()));
  }

  async 다운로드글(내려받음: Download): Promise<string> {
    const 조각들: Buffer[] = [];
    for await (const 조각 of await 내려받음.createReadStream()) 조각들.push(Buffer.from(조각 as Buffer));
    return Buffer.concat(조각들).toString('utf8');
  }
}
