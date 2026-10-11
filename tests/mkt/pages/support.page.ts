import type { FrameLocator, Locator, Page } from '@playwright/test';

import { 상담창 } from '../components/chat.component.js';

export class 고객센터화면 {
  static readonly 주소 = '/support';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 탭목록: Locator;
  readonly 탭들: Locator;
  readonly 패널: Locator;
  readonly 질문들: Locator;
  readonly 열린답: Locator;
  readonly 검색칸: Locator;
  readonly 빈결과: Locator;
  readonly 문의링크: Locator;
  readonly 지도제목: Locator;
  readonly 지도틀: Locator;
  readonly 지도: FrameLocator;
  readonly 지도축소: Locator;
  readonly 지도배율: Locator;
  readonly 상담: 상담창;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '고객센터', level: 1 });
    this.탭목록 = page.getByRole('tablist', { name: 'FAQ 분류' });
    this.탭들 = this.탭목록.getByRole('tab');
    this.패널 = page.getByRole('tabpanel');
    this.질문들 = this.패널.getByRole('button');
    this.열린답 = this.패널.getByRole('region');
    this.검색칸 = page.getByRole('searchbox', { name: 'FAQ 검색' });
    this.빈결과 = page.getByText('검색 결과가 없습니다');
    this.문의링크 = page.getByRole('link', { name: '1:1 문의' });
    this.지도제목 = page.getByRole('heading', { name: '오시는 길' });
    this.지도틀 = page.getByTitle('오시는 길 지도');
    this.지도 = page.frameLocator('iframe[title="오시는 길 지도"]');
    this.지도축소 = this.지도.getByRole('button', { name: '축소' });
    this.지도배율 = this.지도.getByText(/^배율 \d$/);
    this.상담 = new 상담창(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(고객센터화면.주소);
    await this.질문들.first().waitFor();
  }

  async 아래에있는가(위: Locator, 아래: Locator): Promise<boolean> {
    const 위칸 = await 위.boundingBox();
    const 아래칸 = await 아래.boundingBox();
    if (위칸 === null || 아래칸 === null) return false;
    return 아래칸.y >= 위칸.y + 위칸.height - 1;
  }

  async 질문글들(): Promise<string[]> {
    const 글들 = await this.질문들.allInnerTexts();
    return 글들.map((글) => 글.replace(/[＋－]\s*$/, '').trim());
  }

  async 배율읽기(): Promise<number> {
    const 글 = await this.지도배율.innerText();
    return Number(글.replace(/\D/g, ''));
  }

  async 상담이그림자안에있는가(): Promise<boolean> {
    return this.상담.요소.evaluate((요소) => {
      const 뿌리 = 요소.shadowRoot;
      if (뿌리 === null) return false;
      const 안 = 뿌리.querySelector('.fab') !== null && 뿌리.querySelector('.panel') !== null;
      const 밖 = document.querySelector('.fab') === null && document.querySelector('.panel') === null;
      return 안 && 밖;
    });
  }
}
