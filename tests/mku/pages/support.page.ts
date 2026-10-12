import type { FrameLocator, Locator, Page } from '@playwright/test';

export class 고객센터화면 {
  static readonly 주소 = '/support';

  readonly 제목: Locator;
  readonly 문의링크: Locator;
  readonly 검색칸: Locator;
  readonly 탭들: Locator;
  readonly 패널: Locator;
  readonly 질문들: Locator;
  readonly 검색없음문구: Locator;
  readonly 오류안내: Locator;
  readonly 오시는길제목: Locator;
  readonly 지도틀: Locator;
  readonly 지도: FrameLocator;
  readonly 지도확대: Locator;
  readonly 지도축소: Locator;
  readonly 지도배율: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '고객센터', level: 1 });
    this.문의링크 = page.getByRole('link', { name: '1:1 문의' });
    this.검색칸 = page.getByLabel('FAQ 검색');
    this.탭들 = page.getByRole('tablist', { name: 'FAQ 분류' }).getByRole('tab');
    this.패널 = page.getByRole('tabpanel');
    this.질문들 = this.패널.getByRole('button');
    this.검색없음문구 = page.getByText('검색 결과가 없습니다');
    this.오류안내 = this.패널.getByText('잠시 후 다시 시도해 주세요', { exact: true });
    this.오시는길제목 = page.getByRole('heading', { name: '오시는 길', level: 2 });
    this.지도틀 = page.getByTitle('오시는 길 지도');
    this.지도 = page.frameLocator('iframe[title="오시는 길 지도"]');
    this.지도확대 = this.지도.getByRole('button', { name: '확대' });
    this.지도축소 = this.지도.getByRole('button', { name: '축소' });
    this.지도배율 = this.지도.getByRole('status');
  }

  async 열기(): Promise<void> {
    await this.page.goto(고객센터화면.주소);
  }

  async 질문글들(): Promise<string[]> {
    const 글들 = await this.질문들.allInnerTexts();
    return 글들.map((글) => 글.replace(/[＋－]$/, '').trim());
  }

  async 답변(질문: Locator): Promise<Locator> {
    const 번호 = await 질문.getAttribute('aria-controls');
    return this.page.locator(`#${번호 ?? ''}`);
  }

  async 답변이보이는가(질문: Locator): Promise<boolean> {
    return (await this.답변(질문)).isVisible();
  }

  async 탭글들(): Promise<string[]> {
    return this.탭들.allInnerTexts();
  }

  async 배율숫자(): Promise<number> {
    return Number((await this.지도배율.innerText()).replace(/[^0-9]/g, ''));
  }

  async 지도가제목아래인가(): Promise<boolean> {
    const 지도 = await this.지도틀.boundingBox();
    const 제목 = await this.오시는길제목.boundingBox();
    return 지도 !== null && 제목 !== null && 지도.y >= 제목.y;
  }
}
