import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  static readonly 주소 = '/';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 배너: Locator;
  readonly 슬라이드들: Locator;
  readonly 이전화살표: Locator;
  readonly 다음화살표: Locator;
  readonly 점들: Locator;
  readonly 이벤트띠: Locator;
  readonly 이벤트띠닫기: Locator;
  readonly 카운트다운: Locator;
  readonly 시계: Locator;
  readonly 인기글탭: Locator;
  readonly 최신글탭: Locator;
  readonly 탭들: Locator;
  readonly 글패널: Locator;
  readonly 글줄들: Locator;
  readonly 글링크들: Locator;
  readonly 추천: Locator;
  readonly 추천카드: Locator;
  readonly 추천이전: Locator;
  readonly 추천다음: Locator;
  readonly 추천행: Locator;
  readonly 머리글안쪽: Locator;
  readonly 공지체크박스: Locator;
  readonly 이벤트띠문구: Locator;
  readonly 첫카드말풍선: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '데모마켓 홈' });
    this.배너 = page.getByRole('region', { name: '배너' });
    this.슬라이드들 = this.배너.getByRole('group');
    this.이전화살표 = this.배너.getByRole('button', { name: '이전', exact: true });
    this.다음화살표 = this.배너.getByRole('button', { name: '다음', exact: true });
    this.점들 = this.배너.getByRole('button', { name: /^\d번 배너$/ });
    this.이벤트띠 = page.getByRole('region', { name: '이벤트' });
    this.이벤트띠닫기 = this.이벤트띠.getByRole('button', { name: '닫기' });
    this.카운트다운 = page.getByText('타임세일 종료까지');
    this.시계 = this.카운트다운.locator('strong');
    this.인기글탭 = page.getByRole('tab', { name: '인기글' });
    this.최신글탭 = page.getByRole('tab', { name: '최신글' });
    this.탭들 = page.getByRole('tab');
    this.글패널 = page.getByRole('tabpanel');
    this.글줄들 = this.글패널.getByRole('listitem');
    this.글링크들 = this.글패널.getByRole('link');
    this.추천 = page.getByRole('region', { name: '추천 상품' });
    this.추천카드 = this.추천.getByRole('link');
    this.추천이전 = page.getByRole('button', { name: '추천 상품 이전' });
    this.추천다음 = page.getByRole('button', { name: '추천 상품 다음' });
    this.추천행 = page.locator('.rec-row');
    this.머리글안쪽 = page.locator('#site-header .header-inner');
    this.이벤트띠문구 = this.이벤트띠.getByText('🎉 가을 맞이 전 상품 무료 배송');
    this.첫카드말풍선 = this.추천카드.first().getByRole('tooltip');
    this.공지체크박스 = page.getByRole('dialog', { name: '공지사항' }).getByRole('checkbox', { name: '오늘 하루 보지 않기' });
  }

  점(번호: number): Locator {
    return this.배너.getByRole('button', { name: `${번호}번 배너`, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
    await this.슬라이드들.first().waitFor();
  }

  async 추천까지열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
    await this.추천카드.first().waitFor();
  }

  async 현재점번호(): Promise<number> {
    const 번호 = await this.점들.evaluateAll((점) => 점.findIndex((d) => d.getAttribute('aria-current') === 'true'));
    return 번호 + 1;
  }

  async 점상태(): Promise<{ 현재: boolean; 채움: boolean }[]> {
    return this.점들.evaluateAll((점) =>
      점.map((d) => ({
        현재: d.getAttribute('aria-current') === 'true',
        채움: getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(d).backgroundColor !== 'transparent',
      })),
    );
  }

  async 슬라이드제목들(): Promise<string[]> {
    return this.배너.getByRole('heading', { level: 2 }).allInnerTexts();
  }

  async 글좋아요들(): Promise<number[]> {
    const 글들 = await this.글줄들.allInnerTexts();
    return 글들.map((글) => Number(/좋아요 (\d+)\s*$/.exec(글)?.[1] ?? Number.NaN));
  }

  async 글제목들(): Promise<string[]> {
    return this.글링크들.allInnerTexts();
  }

  async 추천카드이름들(): Promise<string[]> {
    return this.추천카드.locator('.name').allInnerTexts();
  }

  async 추천카드가로줄수(): Promise<number> {
    return this.추천카드.evaluateAll((카드) => new Set(카드.map((c) => Math.round(c.getBoundingClientRect().top))).size);
  }

  async 배너배치(): Promise<{ 이전왼쪽: boolean; 다음오른쪽: boolean; 점아래: boolean; 점수: number }> {
    const 틀 = await this.배너.boundingBox();
    const 이전 = await this.이전화살표.boundingBox();
    const 다음 = await this.다음화살표.boundingBox();
    const 점 = await this.점들.first().boundingBox();
    if (틀 === null || 이전 === null || 다음 === null || 점 === null) throw new Error('배너 요소의 위치를 읽지 못했다');
    const 가운데x = 틀.x + 틀.width / 2;
    const 가운데y = 틀.y + 틀.height / 2;
    return {
      이전왼쪽: 이전.x + 이전.width / 2 < 가운데x,
      다음오른쪽: 다음.x + 다음.width / 2 > 가운데x,
      점아래: 점.y + 점.height / 2 > 가운데y,
      점수: await this.점들.count(),
    };
  }

  async 아래에있는가(위: Locator, 아래: Locator): Promise<boolean> {
    const 위칸 = await 위.boundingBox();
    const 아래칸 = await 아래.boundingBox();
    if (위칸 === null || 아래칸 === null) return false;
    return 아래칸.y >= 위칸.y + 위칸.height - 1;
  }

  async 오른쪽에있는가(칸: Locator): Promise<boolean> {
    const 상자 = await 칸.boundingBox();
    const 크기 = this.page.viewportSize();
    if (상자 === null || 크기 === null) return false;
    return 상자.x + 상자.width / 2 > 크기.width / 2;
  }

  async 오른쪽아래에있는가(칸: Locator): Promise<boolean> {
    const 상자 = await 칸.boundingBox();
    const 크기 = this.page.viewportSize();
    if (상자 === null || 크기 === null) return false;
    return 상자.x + 상자.width / 2 > 크기.width / 2 && 상자.y + 상자.height / 2 > 크기.height / 2;
  }

  async 시계초(): Promise<number> {
    const [시, 분, 초] = (await this.시계.innerText()).split(':').map(Number);
    return (시 ?? 0) * 3600 + (분 ?? 0) * 60 + (초 ?? 0);
  }

  async 머리글붙음(): Promise<boolean> {
    return this.page.locator('#site-header').evaluate((el) => el.classList.contains('stuck'));
  }

  async 머리글높이(): Promise<number | undefined> {
    return (await this.머리글안쪽.boundingBox())?.height;
  }

  async 공지닫으며전환읽기(): Promise<{ 속성: string; 시간: string; 닫는중: boolean }> {
    return this.page.locator('.modal[role=dialog] .modal-foot').getByRole('button', { name: '닫기', exact: true }).evaluate((버튼) => {
      const 바깥 = 버튼.closest('.modal-backdrop');
      if (바깥 === null) return { 속성: '', 시간: '', 닫는중: false };
      (버튼 as HTMLButtonElement).click();
      const 값 = getComputedStyle(바깥);
      return { 속성: 값.transitionProperty, 시간: 값.transitionDuration, 닫는중: !바깥.classList.contains('open') };
    });
  }

  async 공지열림전환읽기(): Promise<{ 속성: string; 시간: string }> {
    return this.page.locator('.modal-backdrop').first().evaluate((바깥) => {
      const 값 = getComputedStyle(바깥);
      return { 속성: 값.transitionProperty, 시간: 값.transitionDuration };
    });
  }
}
