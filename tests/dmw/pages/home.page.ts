import type { Locator, Page } from '@playwright/test';

import { 홈배너 } from '../components/banner.component.js';
import { 머리글 } from '../components/header.component.js';
import { 모달 } from '../components/modal.component.js';
import { 두프레임기다리기 } from '../helpers/common-tools.helper.js';

export class 홈화면 {
  static readonly 주소 = '/';

  readonly 머리: 머리글;
  readonly 배너: 홈배너;
  readonly 공지창: 모달;
  readonly 설문창: 모달;
  readonly 공지체크: Locator;
  readonly 이벤트띠: Locator;
  readonly 이벤트띠닫기: Locator;
  readonly 카운트다운: Locator;
  readonly 카운트다운값: Locator;
  readonly 글영역: Locator;
  readonly 인기글탭: Locator;
  readonly 최신글탭: Locator;
  readonly 글링크들: Locator;
  readonly 추천영역: Locator;
  readonly 추천제목: Locator;
  readonly 추천이전: Locator;
  readonly 추천다음: Locator;
  readonly 추천카드들: Locator;
  readonly 추천줄: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.배너 = new 홈배너(page);
    this.공지창 = new 모달(page, '공지사항');
    this.설문창 = new 모달(page, '만족도 설문');
    this.공지체크 = this.공지창.창.getByRole('checkbox', { name: '오늘 하루 보지 않기', exact: true });
    this.이벤트띠 = page.getByRole('region', { name: '이벤트' });
    this.이벤트띠닫기 = this.이벤트띠.getByRole('button', { name: '닫기', exact: true });
    this.카운트다운 = page.getByText('타임세일 종료까지');
    this.카운트다운값 = this.카운트다운.locator('strong');
    this.글영역 = page.getByRole('region', { name: '게시글' });
    this.인기글탭 = this.글영역.getByRole('tab', { name: '인기글', exact: true });
    this.최신글탭 = this.글영역.getByRole('tab', { name: '최신글', exact: true });
    this.글링크들 = this.글영역.getByRole('tabpanel').getByRole('link');
    this.추천영역 = page.getByRole('region', { name: '추천 상품' });
    this.추천제목 = this.추천영역.getByRole('heading', { name: '추천 상품', exact: true });
    this.추천이전 = this.추천영역.getByRole('button', { name: '추천 상품 이전', exact: true });
    this.추천다음 = this.추천영역.getByRole('button', { name: '추천 상품 다음', exact: true });
    this.추천카드들 = this.추천영역.getByRole('link');
    this.추천줄 = this.추천영역.locator('.rec-row');
  }

  async 열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
    await this.그려질때까지();
  }

  async 머리만열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
    await this.머리.그려질때까지();
  }

  async 머리만열고설정응답까지(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/settings'));
    await this.머리만열기();
    await 응답;
    await 두프레임기다리기(this.page);
  }

  async 게시글상세그려질때까지(): Promise<void> {
    await this.page.getByRole('button', { name: '링크 복사', exact: true }).waitFor();
  }

  추천카드이름(카드: Locator): Locator {
    return 카드.locator('.name');
  }

  추천툴팁(카드: Locator): Locator {
    return 카드.getByRole('tooltip');
  }

  로그아웃확인문구(): Locator {
    return new 모달(this.page, '확인').창.getByText('로그아웃 하시겠습니까?', { exact: true });
  }

  머리글이름(이름: string): Locator {
    return this.머리.영역.getByText(`${이름}님`, { exact: true });
  }

  async 상품상세그려질때까지(): Promise<void> {
    await this.page.getByRole('button', { name: '장바구니 담기', exact: true }).waitFor();
  }

  async 공지창이자리잡을때까지(): Promise<void> {
    await this.공지창.뜰때까지();
    await this.page.locator('.modal-backdrop.open').filter({ has: this.공지창.창 }).waitFor();
    await this.공지창.창.evaluate(async (창) => {
      await Promise.allSettled(창.getAnimations().map((하나) => 하나.finished));
    });
  }

  async 열고장바구니응답까지(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/cart') && r.request().method() === 'GET');
    await this.열기();
    await 응답;
    await 두프레임기다리기(this.page);
  }

  async 열고설정응답까지(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/settings'));
    await this.열기();
    await 응답;
    await 두프레임기다리기(this.page);
  }

  async 그려질때까지(): Promise<void> {
    await this.글링크들.first().waitFor();
    await this.추천카드들.first().waitFor();
    await this.머리.그려질때까지();
  }

  async 글제목들(): Promise<string[]> {
    return this.글링크들.allInnerTexts();
  }

  async 글번호들(): Promise<number[]> {
    const 주소들 = await this.글링크들.evaluateAll((링크들) => 링크들.map((링크) => 링크.getAttribute('href') ?? ''));
    return 주소들.map((주소) => Number(주소.split('/').pop()));
  }

  async 글줄들(): Promise<string[]> {
    return this.글영역.getByRole('tabpanel').getByRole('listitem').allInnerTexts();
  }

  async 추천상품이름들(): Promise<string[]> {
    return this.추천카드들.locator('.name').allInnerTexts();
  }

  async 아래로내리기(픽셀: number): Promise<void> {
    await this.page.evaluate((y) => window.scrollTo(0, y), 픽셀);
    await 두프레임기다리기(this.page);
  }

  async 머리글붙음(): Promise<boolean> {
    return this.머리.영역.evaluate((요소) => getComputedStyle(요소).boxShadow !== 'none');
  }

  async 머리글높이(): Promise<number> {
    return this.머리.영역.locator('.header-inner').evaluate(async (요소) => {
      await Promise.allSettled(요소.getAnimations().map((하나) => 하나.finished));
      return Math.round(요소.getBoundingClientRect().height);
    });
  }

  async 배너장이영역안인가(차례: number): Promise<boolean> {
    const 장 = await this.배너.장들.nth(차례 - 1).boundingBox();
    const 영역 = await this.배너.영역.boundingBox();
    if (장 === null || 영역 === null) throw new Error('배너 장이나 영역이 화면에 없어 자리를 잴 수 없다');
    return 장.x >= 영역.x - 1 && 장.x < 영역.x + 영역.width - 1;
  }

  async 현재점채워짐(): Promise<boolean> {
    return this.배너.현재점.evaluate((점) => getComputedStyle(점).backgroundColor !== 'rgba(0, 0, 0, 0)');
  }

  async 배너넘김끝날때까지(): Promise<void> {
    await this.배너.영역.locator('.track').evaluate(async (줄) => {
      await Promise.allSettled(줄.getAnimations().map((하나) => 하나.finished));
    });
  }

  async 추천줄멈출때까지(): Promise<void> {
    await this.추천줄.evaluate(
      (줄) =>
        new Promise<void>((끝) => {
          let 앞 = -1;
          let 같은횟수 = 0;
          const 보기 = (): void => {
            같은횟수 = 줄.scrollLeft === 앞 ? 같은횟수 + 1 : 0;
            앞 = 줄.scrollLeft;
            if (같은횟수 >= 5) 끝();
            else requestAnimationFrame(보기);
          };
          requestAnimationFrame(보기);
        }),
    );
  }

  async 마우스치우기(): Promise<void> {
    await this.page.mouse.move(2, 400);
  }

  async 이벤트띠가배너와글탭사이인가(): Promise<boolean> {
    const 띠 = await this.이벤트띠.boundingBox();
    const 배너 = await this.배너.영역.boundingBox();
    const 글 = await this.글영역.boundingBox();
    if (띠 === null || 배너 === null || 글 === null) throw new Error('띠 · 배너 · 글 탭이 화면에 없어 자리를 잴 수 없다');
    return 띠.y >= 배너.y + 배너.height - 1 && 띠.y + 띠.height <= 글.y + 1;
  }

  async 추천카드높이들(): Promise<number> {
    const 높이들 = await this.추천카드들.evaluateAll((카드들) => 카드들.map((카드) => Math.round(카드.getBoundingClientRect().top)));
    return new Set(높이들).size;
  }

  async 추천줄가로위치(): Promise<number> {
    return this.추천줄.evaluate((줄) => Math.round(줄.scrollLeft));
  }

  async 글탭자리(): Promise<number> {
    const 상자 = await this.글영역.boundingBox();
    if (상자 === null) throw new Error('글 탭이 화면에 없어 자리를 잴 수 없다');
    return Math.round(상자.y + (await this.page.evaluate(() => window.scrollY)));
  }
}
