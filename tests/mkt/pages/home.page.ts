import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/');
  }

  배너(): Locator {
    return this.page.getByRole('region', { name: '배너', exact: true });
  }

  배너장들(): Locator {
    return this.배너().getByRole('group');
  }

  배너점들(): Locator {
    return this.배너().getByRole('button', { name: /^\d번 배너$/ });
  }

  배너점(번호: number): Locator {
    return this.배너().getByRole('button', { name: `${번호}번 배너`, exact: true });
  }

  현재배너점(): Locator {
    return this.배너점들().and(this.page.locator('[aria-current="true"]'));
  }

  이전화살표(): Locator {
    return this.배너().getByRole('button', { name: '이전', exact: true });
  }

  다음화살표(): Locator {
    return this.배너().getByRole('button', { name: '다음', exact: true });
  }

  async 현재배너번호(): Promise<string | null> {
    return this.현재배너점().getAttribute('aria-label');
  }

  async 현재배너점배경색(): Promise<string> {
    return this.현재배너점().evaluate((점) => getComputedStyle(점).backgroundColor);
  }

  카운트다운(): Locator {
    return this.page.getByText(/^타임세일 종료까지/);
  }

  카운트다운시간(): Locator {
    return this.page.getByText(/^\d{2}:\d{2}:\d{2}$/);
  }

  인기글탭(): Locator {
    return this.page.getByRole('tab', { name: '인기글', exact: true });
  }

  최신글탭(): Locator {
    return this.page.getByRole('tab', { name: '최신글', exact: true });
  }

  선택된탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  글목록(): Locator {
    return this.page.getByRole('tabpanel');
  }

  글제목링크들(): Locator {
    return this.글목록().getByRole('link');
  }

  글제목링크(제목: string): Locator {
    return this.글목록().getByRole('link', { name: 제목, exact: true });
  }

  글줄들(): Locator {
    return this.글목록().getByRole('listitem');
  }

  추천상품카드들(): Locator {
    return this.page.getByRole('region', { name: '추천 상품', exact: true }).getByRole('link');
  }

  공지팝업(): Locator {
    return this.page.getByRole('dialog', { name: '공지사항', exact: true });
  }

  공지팝업닫기버튼(): Locator {
    return this.공지팝업().getByRole('button', { name: '닫기', exact: true }).filter({ hasText: '닫기' });
  }

  공지팝업하루숨김체크(): Locator {
    return this.공지팝업().getByRole('checkbox', { name: '오늘 하루 보지 않기', exact: true });
  }

  async 공지팝업닫기(): Promise<void> {
    await this.공지팝업().waitFor();
    await this.공지팝업닫기버튼().click();
    await this.공지팝업().waitFor({ state: 'hidden' });
  }

  이벤트띠(): Locator {
    return this.page.getByRole('region', { name: '이벤트', exact: true });
  }

  이벤트띠문구(문구: string): Locator {
    return this.이벤트띠().getByText(문구, { exact: true });
  }

  이벤트띠닫기버튼(): Locator {
    return this.이벤트띠().getByRole('button', { name: '닫기', exact: true });
  }

  설문모달(): Locator {
    return this.page.getByRole('dialog', { name: '만족도 설문', exact: true });
  }

  설문참여버튼(): Locator {
    return this.설문모달().getByRole('button', { name: '참여하기', exact: true });
  }

  설문다음에버튼(): Locator {
    return this.설문모달().getByRole('button', { name: '다음에', exact: true });
  }

  맨위로버튼(): Locator {
    return this.page.getByRole('button', { name: '맨 위로', exact: true });
  }

  붙은머리글(): Locator {
    return this.page.getByRole('banner').and(this.page.locator('.stuck'));
  }

  머리글안쪽(): Locator {
    return this.page.getByRole('banner').locator('.header-inner');
  }

  펼쳐진햄버거버튼(): Locator {
    return this.page.getByRole('banner').getByRole('button', { name: '메뉴 열기', exact: true, expanded: true });
  }

  async 아래로내리기(픽셀: number): Promise<void> {
    await this.page.mouse.wheel(0, 픽셀);
  }

  async 마우스치우기(): Promise<void> {
    await this.page.mouse.move(0, 300);
  }

  async 스크롤위치(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async 화면너비(): Promise<number> {
    return this.page.evaluate(() => window.innerWidth);
  }

  async 스크롤이멈추기를기다린다(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((끝) => {
          let 이전 = -1;
          let 같은횟수 = 0;
          const 확인 = (): void => {
            같은횟수 = window.scrollY === 이전 ? 같은횟수 + 1 : 0;
            이전 = window.scrollY;
            if (같은횟수 >= 5) 끝();
            else requestAnimationFrame(확인);
          };
          requestAnimationFrame(확인);
        }),
    );
  }

  async 머리글움직임이끝나기를기다린다(): Promise<void> {
    await this.page.waitForFunction(
      () => (document.getElementById('site-header')?.getAnimations({ subtree: true }).length ?? 0) === 0,
    );
  }

  async 위아래로놓여있는가(위: Locator, 아래: Locator): Promise<boolean> {
    const 위상자 = await 위.boundingBox();
    const 아래상자 = await 아래.boundingBox();
    return 위상자 !== null && 아래상자 !== null && 위상자.y + 위상자.height <= 아래상자.y;
  }

  async 화면중심기준위치(대상: Locator): Promise<{ 가로: number; 세로: number }> {
    const 상자 = await 대상.boundingBox();
    const 화면 = this.page.viewportSize();
    if (상자 === null || 화면 === null) throw new Error('위치를 잴 수 없다: 대상이 화면에 없거나 화면 크기를 모른다');
    return { 가로: 상자.x + 상자.width / 2 - 화면.width / 2, 세로: 상자.y + 상자.height / 2 - 화면.height / 2 };
  }

  async 주메뉴링크가화면안에있는가(이름: string): Promise<boolean> {
    return this.page
      .getByRole('navigation', { name: '주 메뉴', exact: true })
      .getByRole('link', { name: 이름, exact: true })
      .evaluate((링크) => {
        const 상자 = 링크.getBoundingClientRect();
        return 상자.width > 0 && 상자.left >= 0 && 상자.right <= window.innerWidth;
      });
  }
}
