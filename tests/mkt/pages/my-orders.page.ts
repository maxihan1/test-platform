import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 주문내역화면 {
  static readonly 주소 = '/my/orders';
  readonly 제목: Locator;
  readonly 왼쪽메뉴: Locator;
  readonly 주문내역메뉴: Locator;
  readonly 회원정보수정메뉴: Locator;
  readonly 회원탈퇴메뉴: Locator;
  readonly 기간묶음: Locator;
  readonly 표: Locator;
  readonly 열머리: Locator;
  readonly 줄들: Locator;
  readonly 불러오는중: Locator;
  readonly 빈상태: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 내역', level: 1 });
    this.왼쪽메뉴 = page.getByRole('navigation', { name: '마이페이지 메뉴' });
    this.주문내역메뉴 = this.왼쪽메뉴.getByRole('link', { name: '주문 내역', exact: true });
    this.회원정보수정메뉴 = this.왼쪽메뉴.getByRole('link', { name: '회원정보 수정', exact: true });
    this.회원탈퇴메뉴 = this.왼쪽메뉴.getByRole('link', { name: '회원 탈퇴', exact: true });
    this.기간묶음 = page.getByRole('group', { name: '조회 기간' });
    this.표 = page.getByRole('table');
    this.열머리 = this.표.getByRole('columnheader');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.불러오는중 = page.getByLabel('불러오는 중');
    this.빈상태 = page.getByText('주문 내역이 없습니다');
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문내역화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.목록그려질때까지();
  }

  async 목록그려질때까지(): Promise<void> {
    await this.불러오는중.waitFor({ state: 'detached' });
    await this.줄들.first().or(this.빈상태).waitFor();
  }

  기간버튼(이름: string): Locator {
    return this.기간묶음.getByRole('button', { name: 이름, exact: true });
  }

  async 기간누르기(이름: string): Promise<void> {
    await this.기간버튼(이름).click();
    await this.목록그려질때까지();
  }

  async 골라진기간(): Promise<string[]> {
    return this.기간묶음.getByRole('button', { pressed: true }).allInnerTexts();
  }

  async 열머리글자(): Promise<string[]> {
    return this.열머리.allInnerTexts();
  }

  async 줄칸글자(): Promise<string[][]> {
    const 줄수 = await this.줄들.count();
    const 결과: string[][] = [];
    for (let i = 0; i < 줄수; i++) {
      결과.push(await this.줄들.nth(i).getByRole('cell').allInnerTexts());
    }
    return 결과;
  }

  async 주문일들(): Promise<string[]> {
    return (await this.줄칸글자()).map((칸) => 칸[0] ?? '');
  }

  async 첫줄주문번호(): Promise<string> {
    return (await this.줄들.first().getByRole('link').innerText()).trim();
  }

  async 첫줄누르기(): Promise<void> {
    await this.줄들.first().getByRole('cell').first().click();
  }

  async 메뉴가본문앞에있는가(): Promise<boolean> {
    const 메뉴 = await this.왼쪽메뉴.boundingBox();
    const 본문 = await this.제목.boundingBox();
    if (!메뉴 || !본문) return false;
    return this.머리글.좁은가() ? 메뉴.y + 메뉴.height <= 본문.y : 메뉴.x + 메뉴.width <= 본문.x;
  }

  async 강조된메뉴(): Promise<string[]> {
    const 링크들 = [this.주문내역메뉴, this.회원정보수정메뉴, this.회원탈퇴메뉴];
    const 강조: string[] = [];
    for (const 링크 of 링크들) {
      if ((await 링크.getAttribute('aria-current')) === 'page') 강조.push((await 링크.innerText()).trim());
    }
    return 강조;
  }

  상태글자(상태: string): Locator {
    return this.줄들.getByText(상태, { exact: true });
  }

  async 상태색들(): Promise<string[]> {
    const 색: string[] = [];
    for (const 상태 of ['결제완료', '배송중', '배송완료', '주문취소']) {
      색.push(await this.상태글자(상태).evaluate((요소) => `${getComputedStyle(요소).color}/${getComputedStyle(요소).backgroundColor}`));
    }
    return 색;
  }
}
