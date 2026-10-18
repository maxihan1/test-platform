import type { FrameLocator, Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 고객센터화면 {
  static readonly 주소 = '/support';
  readonly 제목: Locator;
  readonly 탭목록: Locator;
  readonly 질문칸: Locator;
  readonly 질문들: Locator;
  readonly 펼친답들: Locator;
  readonly 검색칸: Locator;
  readonly 검색없음: Locator;
  readonly 오류안내: Locator;
  readonly 일대일문의링크: Locator;
  readonly 오시는길: Locator;
  readonly 지도틀: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '고객센터', level: 1 });
    this.탭목록 = page.getByRole('tablist', { name: 'FAQ 분류' });
    this.질문칸 = page.getByRole('tabpanel');
    this.질문들 = this.질문칸.getByRole('button');
    this.펼친답들 = this.질문칸.getByRole('region');
    this.검색칸 = page.getByRole('searchbox', { name: 'FAQ 검색' });
    this.검색없음 = this.질문칸.getByText('검색 결과가 없습니다');
    this.오류안내 = this.질문칸.locator('.empty-state');
    this.일대일문의링크 = page.getByRole('link', { name: '1:1 문의', exact: true });
    this.오시는길 = page.getByRole('region', { name: '오시는 길' });
    this.지도틀 = this.오시는길.getByTitle('오시는 길 지도');
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(고객센터화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.목록그려질때까지();
  }

  async 목록그려질때까지(): Promise<void> {
    await this.질문들.first().or(this.오류안내).waitFor();
  }

  탭(이름: string): Locator {
    return this.탭목록.getByRole('tab', { name: 이름, exact: true });
  }

  async 탭누르기(이름: string): Promise<void> {
    await this.탭(이름).click();
    await this.질문들.first().waitFor();
  }

  질문(글: string, 펼침?: boolean): Locator {
    return this.질문칸.getByRole('button', { name: 글, ...(펼침 === undefined ? {} : { expanded: 펼침 }) });
  }

  async 질문글들(): Promise<string[]> {
    const 글들 = await this.질문들.allInnerTexts();
    return 글들.map((글) => 글.replace(/[＋－]\s*$/, '').trim());
  }

  async 질문누르기(글: string): Promise<void> {
    await this.질문(글).click();
  }

  async 검색하기(글: string): Promise<void> {
    await this.검색칸.fill(글);
  }

  async 탭이름들(): Promise<string[]> {
    return this.탭목록.getByRole('tab').allInnerTexts();
  }

  get 지도(): FrameLocator {
    return this.지도틀.contentFrame();
  }

  get 확대버튼(): Locator {
    return this.지도.getByRole('button', { name: '확대', exact: true });
  }

  get 축소버튼(): Locator {
    return this.지도.getByRole('button', { name: '축소', exact: true });
  }

  get 배율(): Locator {
    return this.지도.getByRole('status');
  }

  async 배율숫자(): Promise<number> {
    const 글 = await this.배율.innerText();
    return Number(글.replace(/\D/g, ''));
  }
}
