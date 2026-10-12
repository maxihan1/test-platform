import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  static readonly 주소 = '/';

  readonly 제목: Locator;
  readonly 배너: Locator;
  readonly 슬라이드: Locator;
  readonly 슬라이드줄: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 점들: Locator;
  readonly 이벤트띠: Locator;
  readonly 이벤트띠글: Locator;
  readonly 이벤트띠닫기: Locator;
  readonly 카운트다운: Locator;
  readonly 시계: Locator;
  readonly 글탭목록: Locator;
  readonly 인기글탭: Locator;
  readonly 최신글탭: Locator;
  readonly 글패널: Locator;
  readonly 글링크들: Locator;
  readonly 글항목들: Locator;
  readonly 추천영역: Locator;
  readonly 추천행: Locator;
  readonly 추천카드들: Locator;
  readonly 추천이전: Locator;
  readonly 추천다음: Locator;
  readonly 말풍선: Locator;
  readonly 공지창: Locator;
  readonly 공지닫기: Locator;
  readonly 공지하루안봄: Locator;
  readonly 설문창: Locator;
  readonly 설문참여: Locator;
  readonly 설문다음에: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '데모마켓 홈', level: 1 });
    this.배너 = page.getByRole('region', { name: '배너' });
    this.슬라이드 = this.배너.getByRole('group');
    this.슬라이드줄 = this.배너.locator('.track');
    this.이전 = this.배너.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.배너.getByRole('button', { name: '다음', exact: true });
    this.점들 = this.배너.getByRole('button', { name: /번 배너$/ });
    this.이벤트띠 = page.getByRole('region', { name: '이벤트' });
    this.이벤트띠글 = this.이벤트띠.getByText('🎉 가을 맞이 전 상품 무료 배송');
    this.이벤트띠닫기 = this.이벤트띠.getByRole('button', { name: '닫기' });
    this.카운트다운 = page.getByText('타임세일 종료까지');
    this.시계 = this.카운트다운.locator('strong');
    this.글탭목록 = page.getByRole('tablist');
    this.인기글탭 = page.getByRole('tab', { name: '인기글' });
    this.최신글탭 = page.getByRole('tab', { name: '최신글' });
    this.글패널 = page.getByRole('tabpanel');
    this.글링크들 = this.글패널.getByRole('link');
    this.글항목들 = this.글패널.getByRole('listitem');
    this.추천영역 = page.getByRole('region', { name: '추천 상품' });
    this.추천행 = this.추천영역.locator('.rec-row');
    this.추천카드들 = this.추천영역.getByRole('link');
    this.추천이전 = this.추천영역.getByRole('button', { name: '추천 상품 이전' });
    this.추천다음 = this.추천영역.getByRole('button', { name: '추천 상품 다음' });
    this.말풍선 = this.추천영역.getByRole('tooltip');
    this.공지창 = page.getByRole('dialog', { name: '공지사항' });
    this.공지닫기 = this.공지창.locator('.modal-foot').getByRole('button', { name: '닫기' });
    this.공지하루안봄 = this.공지창.getByRole('checkbox', { name: '오늘 하루 보지 않기' });
    this.설문창 = page.getByRole('dialog', { name: '만족도 설문' });
    this.설문참여 = this.설문창.getByRole('button', { name: '참여하기' });
    this.설문다음에 = this.설문창.getByRole('button', { name: '다음에' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
  }

  점(번호: number): Locator {
    return this.배너.getByRole('button', { name: `${String(번호)}번 배너`, exact: true });
  }

  async 현재점번호(): Promise<number> {
    return this.점들.evaluateAll((점) => 점.findIndex((p) => p.getAttribute('aria-current') === 'true') + 1);
  }

  async 보이는배너번호(): Promise<number> {
    return this.슬라이드줄.evaluate((줄) => {
      const 찾음 = /translateX\(-?([\d.]+)%\)/.exec(줄.style.transform);
      return 찾음 === null ? 1 : Math.round(Number(찾음[1]) / 100) + 1;
    });
  }

  async 점채움상태(): Promise<boolean[]> {
    return this.점들.evaluateAll((점) => 점.map((p) => getComputedStyle(p).backgroundColor !== 'rgba(0, 0, 0, 0)'));
  }

  async 첫슬라이드제목(): Promise<string> {
    return this.슬라이드.first().getByRole('heading').innerText();
  }

  async 카드이름들(): Promise<string[]> {
    return this.추천카드들.evaluateAll((카드) => 카드.map((c) => c.querySelector('.name')?.textContent ?? ''));
  }

  async 가려진카드번호들(): Promise<number[]> {
    return this.추천행.evaluate((행) => {
      const 틀 = 행.getBoundingClientRect();
      return [...행.querySelectorAll('a.product')]
        .map((카드, i) => ({ i, 칸: 카드.getBoundingClientRect() }))
        .filter((x) => x.칸.left < 틀.left - 1 || x.칸.right > 틀.right + 1)
        .map((x) => x.i);
    });
  }

  async 스크롤멈출때까지기다리기(): Promise<void> {
    await this.추천행.evaluate(
      (행) =>
        new Promise<void>((끝) => {
          let 마지막 = 행.scrollLeft;
          let 같은횟수 = 0;
          const 보기 = (): void => {
            if (행.scrollLeft === 마지막) 같은횟수 += 1;
            else {
              같은횟수 = 0;
              마지막 = 행.scrollLeft;
            }
            if (같은횟수 >= 8) 끝();
            else requestAnimationFrame(보기);
          };
          requestAnimationFrame(보기);
        }),
    );
  }

  async 글번호들(): Promise<number[]> {
    return this.글링크들.evaluateAll((링크) => 링크.map((a) => Number(a.getAttribute('href')?.split('/').pop())));
  }

  async 시계초(): Promise<number> {
    const 글 = await this.시계.innerText();
    const [시, 분, 초] = 글.split(':').map(Number);
    return (시 ?? 0) * 3600 + (분 ?? 0) * 60 + (초 ?? 0);
  }
}
