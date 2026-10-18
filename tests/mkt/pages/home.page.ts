import type { Locator, Page } from '@playwright/test';
import { 바닥글 } from '../components/footer.component.js';
import { 머리글 } from '../components/header.component.js';
import { 모달 } from '../components/modal.component.js';
import { 상담창 } from '../components/chat.component.js';
import { 토스트 } from '../components/toast.component.js';
import { 두프레임뒤, 스크롤멈출때까지기다리기 } from '../helpers/common-tools.helper.js';

export interface 글줄 {
  제목: string;
  좋아요: number;
}

export class 홈화면 {
  static readonly 주소 = '/';
  readonly 제목: Locator;
  readonly 배너: Locator;
  readonly 배너제목들: Locator;
  readonly 이전화살표: Locator;
  readonly 다음화살표: Locator;
  readonly 배너점들: Locator;
  readonly 이벤트띠: Locator;
  readonly 이벤트띠글: Locator;
  readonly 이벤트띠닫기: Locator;
  readonly 타임세일시계: Locator;
  readonly 인기글탭: Locator;
  readonly 최신글탭: Locator;
  readonly 글패널: Locator;
  readonly 글제목링크들: Locator;
  readonly 추천영역: Locator;
  readonly 추천카드들: Locator;
  readonly 추천이전: Locator;
  readonly 추천다음: Locator;
  readonly 추천줄: Locator;
  readonly 공지팝업: Locator;
  readonly 공지닫기버튼: Locator;
  readonly 공지X: Locator;
  readonly 공지오늘하루체크: Locator;
  readonly 설문팝업: Locator;
  readonly 설문참여버튼: Locator;
  readonly 설문다음에버튼: Locator;
  readonly 팝업배경: Locator;
  readonly 머리글: 머리글;
  readonly 바닥글: 바닥글;
  readonly 모달: 모달;
  readonly 토스트: 토스트;
  readonly 상담창: 상담창;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '데모마켓 홈', level: 1 });
    this.배너 = page.getByRole('region', { name: '배너' });
    this.배너제목들 = this.배너.getByRole('heading', { level: 2 });
    this.이전화살표 = this.배너.getByRole('button', { name: '이전', exact: true });
    this.다음화살표 = this.배너.getByRole('button', { name: '다음', exact: true });
    this.배너점들 = this.배너.getByRole('button', { name: /^\d+번 배너$/ });
    this.이벤트띠 = page.getByRole('region', { name: '이벤트' });
    this.이벤트띠글 = this.이벤트띠.getByText('🎉 가을 맞이 전 상품 무료 배송');
    this.이벤트띠닫기 = this.이벤트띠.getByRole('button', { name: '닫기' });
    this.타임세일시계 = page.getByText('타임세일 종료까지').locator('strong');
    this.인기글탭 = page.getByRole('tab', { name: '인기글' });
    this.최신글탭 = page.getByRole('tab', { name: '최신글' });
    this.글패널 = page.getByRole('tabpanel');
    this.글제목링크들 = this.글패널.getByRole('link');
    this.추천영역 = page.getByRole('region', { name: '추천 상품' });
    this.추천카드들 = this.추천영역.getByRole('link');
    this.추천이전 = this.추천영역.getByRole('button', { name: '추천 상품 이전' });
    this.추천다음 = this.추천영역.getByRole('button', { name: '추천 상품 다음' });
    this.추천줄 = this.추천영역.locator('.rec-row');
    this.공지팝업 = page.getByRole('dialog', { name: '공지사항' });
    this.공지닫기버튼 = this.공지팝업.getByRole('button', { name: '닫기' }).filter({ hasText: '닫기' });
    this.공지X = this.공지팝업.getByRole('button', { name: '닫기' }).filter({ hasText: '×' });
    this.공지오늘하루체크 = this.공지팝업.getByRole('checkbox', { name: '오늘 하루 보지 않기' });
    this.설문팝업 = page.getByRole('dialog', { name: '만족도 설문' });
    this.설문참여버튼 = this.설문팝업.getByRole('button', { name: '참여하기' });
    this.설문다음에버튼 = this.설문팝업.getByRole('button', { name: '다음에' });
    this.팝업배경 = page.locator('.modal-backdrop');
    this.머리글 = new 머리글(page);
    this.바닥글 = new 바닥글(page);
    this.모달 = new 모달(page);
    this.토스트 = new 토스트(page);
    this.상담창 = new 상담창(page);
  }

  async 열기(): Promise<void> {
    await this.page.waitForLoadState('load');
    await this.page.goto(홈화면.주소);
    await this.그려질때까지();
  }

  async 머리글바닥글만열기(): Promise<void> {
    await this.page.waitForLoadState('load');
    await this.page.goto(홈화면.주소);
    await this.머리글.그려질때까지();
    await this.바닥글.그려질때까지();
  }

  async 회원으로열기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/cart') && r.request().method() === 'GET');
    await this.page.goto(홈화면.주소);
    await 응답;
    await this.그려질때까지();
    await 두프레임뒤(this.page);
  }

  async 머리글전환끝날때까지(): Promise<void> {
    await this.머리글.영역.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((움직임) => 움직임.finished)).then(() => undefined));
  }

  async 맨위로위치(): Promise<{ 보임: boolean; 오른쪽: boolean; 아래: boolean }> {
    const 상자 = await this.바닥글.맨위로.boundingBox();
    const 창 = this.page.viewportSize();
    if (!상자 || !창) return { 보임: false, 오른쪽: false, 아래: false };
    return { 보임: await this.바닥글.맨위로.isVisible(), 오른쪽: 상자.x + 상자.width / 2 > 창.width / 2, 아래: 상자.y + 상자.height / 2 > 창.height / 2 };
  }

  async 그려질때까지(): Promise<void> {
    await this.머리글.그려질때까지();
    await this.배너점들.first().waitFor();
    await this.글제목링크들.first().waitFor();
    await this.추천카드들.first().waitFor();
  }

  배너점(번호: number): Locator {
    return this.배너.getByRole('button', { name: `${번호}번 배너`, exact: true });
  }

  현재배너점(번호: number): Locator {
    return this.배너.locator(`button[aria-label="${번호}번 배너"][aria-current="true"]`);
  }

  async 현재배너번호(): Promise<number> {
    return this.배너점들.evaluateAll((점들) => 점들.findIndex((점) => 점.getAttribute('aria-current') === 'true') + 1);
  }

  async 채워진점번호들(): Promise<number[]> {
    return this.배너점들.evaluateAll((점들) =>
      점들.flatMap((점, 순서) => (getComputedStyle(점).backgroundColor !== 'rgba(0, 0, 0, 0)' ? [순서 + 1] : [])),
    );
  }

  async 글들(): Promise<글줄[]> {
    return this.글패널.getByRole('listitem').evaluateAll((줄들) =>
      줄들.map((줄) => ({
        제목: 줄.querySelector('a')?.textContent ?? '',
        좋아요: Number(/좋아요 (\d+)/.exec(줄.textContent ?? '')?.[1] ?? Number.NaN),
      })),
    );
  }

  async 최신글탭누르기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/posts') && r.url().includes('sort=latest'));
    await this.최신글탭.click();
    await 응답;
    await this.글제목링크들.first().waitFor();
  }

  async 추천카드이름들(): Promise<string[]> {
    return this.추천카드들.getByRole('img').evaluateAll((그림들) => 그림들.map((그림) => 그림.getAttribute('alt') ?? ''));
  }

  async 추천카드높이들(): Promise<number[]> {
    return this.추천카드들.evaluateAll((카드들) => 카드들.map((카드) => Math.round(카드.getBoundingClientRect().top)));
  }

  async 추천줄가로위치(): Promise<number> {
    return this.추천줄.evaluate((줄) => 줄.scrollLeft);
  }

  async 추천줄멈출때까지(): Promise<void> {
    await this.추천줄.evaluate(
      (줄) =>
        new Promise<void>((끝) => {
          let 앞 = 줄.scrollLeft;
          let 같은 = 0;
          const 재기 = () => {
            if (줄.scrollLeft === 앞) 같은 += 1;
            else {
              같은 = 0;
              앞 = 줄.scrollLeft;
            }
            if (같은 >= 8) 끝();
            else requestAnimationFrame(재기);
          };
          requestAnimationFrame(재기);
        }),
    );
  }

  async 타임세일초(): Promise<number> {
    return this.글을초로(await this.타임세일시계.innerText());
  }

  글을초로(글: string): number {
    const 조각 = /^(\d{2}):(\d{2}):(\d{2})$/.exec(글.trim());
    if (!조각) return Number.NaN;
    return Number(조각[1]) * 3600 + Number(조각[2]) * 60 + Number(조각[3]);
  }

  async 아래로내리기(픽셀: number): Promise<void> {
    await this.page.evaluate((y) => window.scrollTo(0, y), 픽셀);
    await 두프레임뒤(this.page);
  }

  async 머리글붙었나(): Promise<boolean> {
    return this.머리글.영역.evaluate((el) => el.classList.contains('stuck'));
  }

  async 머리글높이(): Promise<number> {
    return this.머리글.영역.evaluate((el) => el.clientHeight);
  }

  async 커뮤니티에마우스올리기(): Promise<void> {
    if (this.머리글.좁은가()) await this.page.setViewportSize({ width: 1280, height: 800 });
    await this.머리글.그려질때까지();
    await this.머리글.메뉴('커뮤니티').hover();
  }

  async 메뉴밖으로마우스치우기(): Promise<void> {
    await this.page.mouse.move(5, 600);
    await 두프레임뒤(this.page);
  }

  async 팝업바깥누르기(): Promise<void> {
    await this.page.mouse.click(5, 5);
  }

  async 스크롤이멈출때까지(): Promise<void> {
    await 스크롤멈출때까지기다리기(this.page);
  }

  async 탭으로옮기기(대상: Locator, 최대 = 40): Promise<boolean> {
    for (let 번 = 0; 번 < 최대; 번 += 1) {
      await this.page.keyboard.press('Tab');
      if (await 대상.evaluate((요소) => 요소 === document.activeElement)) return true;
    }
    return false;
  }

  async 쿠키동의누르기(): Promise<void> {
    await this.바닥글.쿠키동의.click({ position: { x: 4, y: 20 } });
  }

  async 시계멈춰두기(): Promise<void> {
    await this.page.clock.install({ time: new Date(2026, 9, 18, 12, 0, 0) });
    await this.page.clock.pauseAt(new Date(2026, 9, 18, 12, 0, 1));
  }

  async 공지팝업없나(): Promise<boolean> {
    return !(await this.공지팝업.isVisible());
  }

  async 공지팝업보이나(): Promise<boolean> {
    await 두프레임뒤(this.page);
    return this.공지팝업.isVisible();
  }

  async 배너장이자리잡았나(번호: number, 제한 = 5000): Promise<boolean> {
    try {
      await this.배너.locator('.track').evaluate((트랙) => Promise.all(트랙.getAnimations().map((움직임) => 움직임.finished)).then(() => undefined));
      await this.page.waitForFunction(
        (n) => {
          const 영역 = document.querySelector('[aria-label="배너"]');
          const 제목 = 영역 ? Array.from(영역.querySelectorAll('h2'))[n - 1] : undefined;
          const 슬라이드 = 제목?.closest('.slide');
          if (!영역 || !슬라이드) return false;
          return Math.abs(슬라이드.getBoundingClientRect().left - 영역.getBoundingClientRect().left) < 2;
        },
        번호,
        { timeout: 제한, polling: 100 },
      );
      return true;
    } catch (오류) {
      if (오류 instanceof Error && 오류.name === 'TimeoutError') return false;
      throw 오류;
    }
  }

  async 배너배치(): Promise<{ 이전은왼쪽: boolean; 다음은오른쪽: boolean; 점은아래: boolean; 점개수: number }> {
    const 영역 = await this.배너.boundingBox();
    const 이전 = await this.이전화살표.boundingBox();
    const 다음 = await this.다음화살표.boundingBox();
    const 점들 = await this.배너점들.evaluateAll((점들) => 점들.map((점) => 점.getBoundingClientRect().top));
    if (!영역 || !이전 || !다음) return { 이전은왼쪽: false, 다음은오른쪽: false, 점은아래: false, 점개수: 점들.length };
    return {
      이전은왼쪽: 이전.x + 이전.width / 2 < 영역.x + 영역.width / 2,
      다음은오른쪽: 다음.x + 다음.width / 2 > 영역.x + 영역.width / 2,
      점은아래: 점들.length > 0 && 점들.every((위) => 위 > 영역.y + 영역.height / 2),
      점개수: 점들.length,
    };
  }

  async 공지팝업이가운데인가(제한 = 5000): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        () => {
          const 창 = document.querySelector<HTMLElement>('[role="dialog"]');
          if (!창) return false;
          return (
            Math.abs(창.offsetLeft + 창.offsetWidth / 2 - innerWidth / 2) <= 4 && Math.abs(창.offsetTop + 창.offsetHeight / 2 - innerHeight / 2) <= 4
          );
        },
        undefined,
        { timeout: 제한 },
      );
      return true;
    } catch (오류) {
      if (오류 instanceof Error && 오류.name === 'TimeoutError') return false;
      throw 오류;
    }
  }

  async 장바구니배지빨강인가(): Promise<boolean> {
    return this.머리글.장바구니배지.evaluate((배지) => {
      const 색 = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(배지).backgroundColor);
      if (!색) return false;
      return Number(색[1]) > 150 && Number(색[2]) < 90 && Number(색[3]) < 90;
    });
  }

  async 머리글메뉴가화면밖인가(): Promise<boolean> {
    const 상자 = await this.머리글.주메뉴.boundingBox();
    return 상자 !== null && 상자.x + 상자.width <= 1;
  }

  async 머리글메뉴가화면안인가(): Promise<boolean> {
    const 상자 = await this.머리글.주메뉴.boundingBox();
    return 상자 !== null && 상자.x >= -1;
  }

  async 머리글메뉴가밀려나올때까지(): Promise<void> {
    await this.page.waitForFunction(() => (document.querySelector('.gnb')?.getBoundingClientRect().left ?? -999) >= -0.5);
  }

  async 쿠키띠가내용위에겹치나(): Promise<boolean> {
    return this.바닥글.쿠키띠.evaluate((띠) => {
      const 상자 = 띠.getBoundingClientRect();
      const 맨위 = document.elementFromPoint(상자.left + 상자.width / 2, 상자.top + 상자.height / 2);
      return getComputedStyle(띠).position === 'fixed' && 맨위 !== null && 띠.contains(맨위);
    });
  }

  async 토스트위치(): Promise<{ 보임: boolean; 가운데: boolean; 아래: boolean }> {
    const 상자 = await this.토스트.모두.last().boundingBox();
    const 창 = this.page.viewportSize();
    if (!상자 || !창) return { 보임: false, 가운데: false, 아래: false };
    return {
      보임: true,
      가운데: Math.abs(상자.x + 상자.width / 2 - 창.width / 2) <= 4,
      아래: 상자.y + 상자.height / 2 > 창.height * 0.7,
    };
  }
}

export class 이동한화면 {
  readonly 게시판목록제목: Locator;
  readonly 게시판목록질문탭: Locator;
  readonly 게시판목록글링크들: Locator;
  readonly 게시판목록검색어칸: Locator;
  readonly 게시판목록검색버튼: Locator;
  readonly 상품목록제목: Locator;
  readonly 상품목록상품링크들: Locator;
  readonly 고객센터제목: Locator;
  readonly 주문내역제목: Locator;
  readonly 장바구니제목: Locator;
  readonly 글쓰기제목: Locator;
  readonly 주문서제목: Locator;
  readonly 문의제목: Locator;
  readonly 게시글상세제목: Locator;

  constructor(readonly page: Page) {
    this.게시판목록제목 = page.getByRole('heading', { name: '커뮤니티', level: 1, exact: true });
    this.게시판목록질문탭 = page.getByRole('tab', { name: '질문', selected: true });
    this.게시판목록글링크들 = page.getByRole('table').getByRole('link');
    this.게시판목록검색어칸 = page.getByRole('searchbox', { name: '검색어' });
    this.게시판목록검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.상품목록제목 = page.getByRole('heading', { name: '쇼핑', level: 1, exact: true });
    this.상품목록상품링크들 = page.getByLabel('상품 목록').getByRole('link');
    this.고객센터제목 = page.getByRole('heading', { name: '고객센터', level: 1, exact: true });
    this.주문내역제목 = page.getByRole('heading', { name: '주문 내역', level: 1, exact: true });
    this.장바구니제목 = page.getByRole('heading', { name: '장바구니', level: 1, exact: true });
    this.글쓰기제목 = page.getByRole('heading', { name: '글쓰기', level: 1, exact: true });
    this.주문서제목 = page.getByRole('heading', { name: '주문서', level: 1, exact: true });
    this.문의제목 = page.getByRole('heading', { name: '1:1 문의', level: 1, exact: true });
    this.게시글상세제목 = page.getByRole('heading', { level: 1 });
  }

  async 게시판목록열기(): Promise<void> {
    await this.page.goto('/board');
    await this.게시판목록글링크들.first().waitFor();
  }

  async 상품목록열기(): Promise<void> {
    await this.page.goto('/shop');
    await this.상품목록상품링크들.first().waitFor();
  }

  async 게시판목록그려질때까지(): Promise<void> {
    await this.게시판목록글링크들.first().waitFor();
  }

  async 상품목록그려질때까지(): Promise<void> {
    await this.상품목록상품링크들.first().waitFor();
  }

  async 주소열기(경로: string): Promise<void> {
    await this.page.goto(경로);
  }
}
