import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 바닥글, 상담, 쿠키띠 } from '../components/site-extra.component.js';

export class 홈화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 바닥글: 바닥글;
  readonly 쿠키띠: 쿠키띠;
  readonly 상담: 상담;
  readonly 배너: Locator;
  readonly 배너제목들: Locator;
  readonly 이전버튼: Locator;
  readonly 다음버튼: Locator;
  readonly 점들: Locator;
  readonly 이벤트띠: Locator;
  readonly 이벤트띠닫기: Locator;
  readonly 게시글상세제목: Locator;
  readonly 이벤트띠문구: Locator;
  readonly 카운트다운: Locator;
  readonly 시계: Locator;
  readonly 글목록: Locator;
  readonly 추천영역: Locator;
  readonly 추천카드들: Locator;
  readonly 추천이전버튼: Locator;
  readonly 추천다음버튼: Locator;
  readonly 추천말풍선: Locator;
  readonly 공지팝업: Locator;
  readonly 공지체크박스: Locator;
  readonly 공지닫기버튼: Locator;
  readonly 공지닫기X: Locator;
  readonly 설문: Locator;
  readonly 설문다음에버튼: Locator;
  readonly 설문참여버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '데모마켓 홈', level: 1 });
    this.머리글 = new 머리글(page);
    this.바닥글 = new 바닥글(page);
    this.쿠키띠 = new 쿠키띠(page);
    this.상담 = new 상담(page);
    this.배너 = page.getByRole('region', { name: '배너', exact: true });
    this.배너제목들 = this.배너.getByRole('heading', { level: 2 });
    this.이전버튼 = this.배너.getByRole('button', { name: '이전', exact: true });
    this.다음버튼 = this.배너.getByRole('button', { name: '다음', exact: true });
    this.점들 = this.배너.getByRole('button', { name: /^\d번 배너$/ });
    this.이벤트띠 = page.getByRole('region', { name: '이벤트', exact: true });
    this.게시글상세제목 = page.getByRole('heading', { level: 1 }).filter({ hasNotText: '데모마켓 홈' });
    this.이벤트띠닫기 = this.이벤트띠.getByRole('button', { name: '닫기', exact: true });
    this.카운트다운 = page.getByText('타임세일 종료까지');
    this.시계 = this.카운트다운.locator('strong');
    this.이벤트띠문구 = this.이벤트띠.getByText('🎉 가을 맞이 전 상품 무료 배송', { exact: true });
    this.글목록 = page.getByRole('tabpanel').getByRole('listitem');
    this.추천영역 = page.getByRole('region', { name: '추천 상품', exact: true });
    this.추천카드들 = this.추천영역.getByRole('link');
    this.추천이전버튼 = this.추천영역.getByRole('button', { name: '추천 상품 이전', exact: true });
    this.추천다음버튼 = this.추천영역.getByRole('button', { name: '추천 상품 다음', exact: true });
    this.추천말풍선 = this.추천영역.getByRole('tooltip');
    this.공지팝업 = page.getByRole('dialog', { name: '공지사항', exact: true });
    this.공지체크박스 = this.공지팝업.getByRole('checkbox', { name: '오늘 하루 보지 않기' });
    this.공지닫기버튼 = this.공지팝업.locator('.modal-foot').getByRole('button', { name: '닫기', exact: true });
    this.공지닫기X = this.공지팝업.locator('.modal-x');
    this.설문 = page.getByRole('dialog', { name: '만족도 설문', exact: true });
    this.설문다음에버튼 = this.설문.getByRole('button', { name: '다음에', exact: true });
    this.설문참여버튼 = this.설문.getByRole('button', { name: '참여하기', exact: true });
  }

  점(번호: number): Locator {
    return this.배너.getByRole('button', { name: `${번호}번 배너`, exact: true });
  }

  게시글탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await Promise.all([this.설정응답(), this.page.goto('/')]);
    await this.끝까지그려졌나기다리기();
  }

  async 새로고침(): Promise<void> {
    await Promise.all([this.설정응답(), this.page.reload()]);
    await this.끝까지그려졌나기다리기();
  }

  private async 설정응답(): Promise<void> {
    await this.page.waitForResponse((응답) => 응답.url().endsWith('/api/settings'));
  }

  async 끝까지그려졌나기다리기(): Promise<void> {
    await this.제목.waitFor();
    await this.배너제목들.nth(2).waitFor();
    await this.글목록.nth(4).waitFor();
    await this.추천카드들.nth(7).waitFor();
    await this.상담.열기버튼.waitFor();
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }

  async 현재배너번호(): Promise<number> {
    const 위치 = await this.점들.evaluateAll((점) => 점.findIndex((요소) => 요소.getAttribute('aria-current') === 'true'));
    return 위치 + 1;
  }

  async 현재배너가될때까지기다리기(번호: number): Promise<void> {
    await this.점(번호).and(this.page.locator('[aria-current=true]')).waitFor();
  }

  async 점이채워졌나(번호: number): Promise<boolean> {
    return this.점(번호).evaluate((점) => getComputedStyle(점).backgroundColor !== 'rgba(0, 0, 0, 0)');
  }

  async 보이는배너번호(): Promise<number> {
    return this.배너.evaluate(
      (영역) =>
        new Promise<number>((끝) => {
          const 슬라이드들 = Array.from(영역.querySelectorAll('.slide'));
          let 앞 = '';
          let 같은횟수 = 0;
          const 재기 = () => {
            const 틀 = 영역.getBoundingClientRect();
            const 위치들 = 슬라이드들.map((슬라이드) => Math.round(슬라이드.getBoundingClientRect().x - 틀.x));
            const 지금 = 위치들.join(',');
            같은횟수 = 지금 === 앞 ? 같은횟수 + 1 : 0;
            앞 = 지금;
            if (같은횟수 >= 10) 끝(위치들.findIndex((x) => Math.abs(x) < 2) + 1);
            else setTimeout(재기, 40);
          };
          재기();
        }),
    );
  }

  async 화살표가좌우에있나(): Promise<boolean> {
    const 틀 = await this.배너.boundingBox();
    const 이전 = await this.이전버튼.boundingBox();
    const 다음 = await this.다음버튼.boundingBox();
    if (!틀 || !이전 || !다음) return false;
    const 가운데 = 틀.x + 틀.width / 2;
    return 이전.x + 이전.width / 2 < 가운데 && 다음.x + 다음.width / 2 > 가운데;
  }

  async 점이배너아래인가(): Promise<boolean> {
    const 틀 = await this.배너.boundingBox();
    const 점 = await this.점(1).boundingBox();
    if (!틀 || !점) return false;
    return 점.y > 틀.y + 틀.height / 2;
  }

  async 배너가글목록보다위쪽인가(): Promise<boolean> {
    const 배너상자 = await this.배너.boundingBox();
    const 글상자 = await this.page.getByRole('region', { name: '게시글', exact: true }).boundingBox();
    if (!배너상자 || !글상자) return false;
    return 배너상자.y + 배너상자.height <= 글상자.y;
  }

  async 공지팝업이가운데인가(): Promise<boolean> {
    const 상자 = await this.공지팝업.boundingBox();
    const 창 = this.page.viewportSize();
    if (!상자 || !창) return false;
    return Math.abs(상자.x + 상자.width / 2 - 창.width / 2) < 창.width * 0.05 && Math.abs(상자.y + 상자.height / 2 - 창.height / 2) < 창.height * 0.1;
  }

  async 공지닫기X가오른쪽위인가(): Promise<boolean> {
    const 창 = await this.공지팝업.boundingBox();
    const 엑스 = await this.공지닫기X.boundingBox();
    if (!창 || !엑스) return false;
    return 엑스.x + 엑스.width / 2 > 창.x + 창.width / 2 && 엑스.y + 엑스.height / 2 < 창.y + 창.height / 2;
  }

  async 이벤트띠높이(): Promise<number> {
    const 상자 = await this.이벤트띠.boundingBox();
    return 상자 ? Math.round(상자.height) : 0;
  }

  async 인기글탭세로위치(): Promise<number> {
    const 상자 = await this.게시글탭('인기글').boundingBox();
    if (!상자) throw new Error('인기글 탭 위치를 읽지 못했다');
    return Math.round(상자.y);
  }

  async 탭이선택됐나(이름: string): Promise<boolean> {
    return (await this.게시글탭(이름).getAttribute('aria-selected')) === 'true';
  }

  async 글제목들(): Promise<string[]> {
    return this.글목록.getByRole('link').allInnerTexts();
  }

  async 글좋아요수들(): Promise<number[]> {
    const 글들 = await this.글목록.allInnerTexts();
    return 글들.map((글) => Number(/좋아요 (\d+)/.exec(글)?.[1] ?? Number.NaN));
  }

  async 첫글주소(): Promise<string> {
    const 주소 = await this.글목록.first().getByRole('link').getAttribute('href');
    if (주소 === null) throw new Error('첫 글의 주소를 읽지 못했다');
    return 주소;
  }

  async 첫글제목(): Promise<string> {
    return this.글목록.first().getByRole('link').innerText();
  }

  async 추천순서(): Promise<string[]> {
    return this.추천카드들.evaluateAll((카드들) => 카드들.map((카드) => 카드.getAttribute('href') ?? ''));
  }

  async 추천첫칸위치(): Promise<number> {
    const 상자 = await this.추천카드들.first().boundingBox();
    if (!상자) throw new Error('추천 상품 위치를 읽지 못했다');
    return Math.round(상자.x);
  }

  async 추천줄이멈출때까지기다리기(): Promise<number> {
    return this.추천카드들.first().evaluate(
      (카드) =>
        new Promise<number>((끝) => {
          let 앞 = -1;
          let 같은횟수 = 0;
          const 재기 = () => {
            const 지금 = Math.round(카드.getBoundingClientRect().x);
            같은횟수 = 지금 === 앞 ? 같은횟수 + 1 : 0;
            앞 = 지금;
            if (같은횟수 >= 8) 끝(지금);
            else setTimeout(재기, 50);
          };
          재기();
        }),
    );
  }

  async 추천이한줄인가(): Promise<boolean> {
    const 상자들 = await this.추천카드들.evaluateAll((카드들) => 카드들.map((카드) => Math.round(카드.getBoundingClientRect().y)));
    return 상자들.length > 0 && 상자들.every((y) => y === 상자들[0]);
  }

  async 추천이탭아래인가(): Promise<boolean> {
    const 영역 = await this.추천영역.boundingBox();
    const 글 = await this.page.getByRole('region', { name: '게시글', exact: true }).boundingBox();
    if (!영역 || !글) return false;
    return 영역.y >= 글.y + 글.height;
  }

  async 시계가탭위인가(): Promise<boolean> {
    const 시계 = await this.카운트다운.boundingBox();
    const 탭 = await this.게시글탭('인기글').boundingBox();
    if (!시계 || !탭) return false;
    return 시계.y + 시계.height <= 탭.y;
  }

  async 시계가바뀔때까지기다리기(이전: string): Promise<void> {
    await this.page.waitForFunction((값) => document.querySelector('strong.clock')?.textContent !== 값, 이전);
  }

  async 이벤트띠가배너와탭사이인가(): Promise<boolean> {
    const 띠 = await this.이벤트띠.boundingBox();
    const 배너 = await this.배너.boundingBox();
    const 탭 = await this.게시글탭('인기글').boundingBox();
    if (!띠 || !배너 || !탭) return false;
    return 띠.y >= 배너.y + 배너.height && 띠.y + 띠.height <= 탭.y;
  }

  async 시계초(): Promise<number> {
    const [시, 분, 초] = (await this.시계.innerText()).split(':').map(Number);
    return (시 ?? 0) * 3600 + (분 ?? 0) * 60 + (초 ?? 0);
  }
}
