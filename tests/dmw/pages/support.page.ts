import type { FrameLocator, Locator, Page } from '@playwright/test';

export class 고객센터화면 {
  static readonly 주소 = '/support';

  readonly 큰제목: Locator;
  readonly 문의링크: Locator;
  readonly 검색칸: Locator;
  readonly 분류탭들: Locator;
  readonly 질문들: Locator;
  readonly 펼친질문: Locator;
  readonly 펼친답들: Locator;
  readonly 검색결과없음: Locator;
  readonly 지도: FrameLocator;
  readonly 확대: Locator;
  readonly 축소: Locator;
  readonly 배율: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '고객센터' });
    this.문의링크 = page.getByRole('link', { name: '1:1 문의', exact: true });
    this.검색칸 = page.getByRole('searchbox', { name: 'FAQ 검색' });
    this.분류탭들 = page.getByRole('tablist', { name: 'FAQ 분류' }).getByRole('tab');
    const 패널 = page.getByRole('tabpanel');
    this.질문들 = 패널.getByRole('button');
    this.펼친질문 = 패널.getByRole('button', { expanded: true });
    this.펼친답들 = 패널.getByRole('region');
    this.검색결과없음 = 패널.getByText('검색 결과가 없습니다', { exact: true });
    this.지도 = page.frameLocator('iframe[title="오시는 길 지도"]');
    this.확대 = this.지도.getByRole('button', { name: '확대', exact: true });
    this.축소 = this.지도.getByRole('button', { name: '축소', exact: true });
    this.배율 = this.지도.getByRole('status');
  }

  async 열기(): Promise<void> {
    await this.page.goto(고객센터화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.질문들.first().waitFor();
    await this.확대.waitFor();
  }

  분류탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  async 분류누르기(이름: string): Promise<void> {
    await this.분류탭(이름).click();
  }

  질문(글: string): Locator {
    return this.질문들.filter({ hasText: 글 });
  }

  async 질문글들(): Promise<string[]> {
    const 글들 = await this.질문들.allInnerTexts();
    return 글들.map((글) => 글.replace(/[＋－]\s*$/, '').trim());
  }

  async 검색하기(글: string): Promise<void> {
    await this.검색칸.fill(글);
  }

  async 배율숫자(): Promise<number> {
    const 글 = (await this.배율.innerText()).replace('배율', '').trim();
    return Number(글);
  }
}
