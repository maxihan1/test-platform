import type { FrameLocator, Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 바닥글, 상담, 쿠키띠 } from '../components/site-extra.component.js';

export class 고객센터화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 바닥글: 바닥글;
  readonly 쿠키띠: 쿠키띠;
  readonly 상담: 상담;
  readonly 분류탭들: Locator;
  readonly 질문들: Locator;
  readonly 펼친답들: Locator;
  readonly 검색칸: Locator;
  readonly 검색버튼: Locator;
  readonly 검색결과없음: Locator;
  readonly 오시는길제목: Locator;
  readonly 지도틀: Locator;
  readonly 지도: FrameLocator;
  readonly 지도그림: Locator;
  readonly 확대버튼: Locator;
  readonly 축소버튼: Locator;
  readonly 배율: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '고객센터', level: 1 });
    this.머리글 = new 머리글(page);
    this.바닥글 = new 바닥글(page);
    this.쿠키띠 = new 쿠키띠(page);
    this.상담 = new 상담(page);
    this.분류탭들 = page.getByRole('tablist', { name: 'FAQ 분류' }).getByRole('tab');
    this.질문들 = page.getByRole('tabpanel').getByRole('button');
    this.펼친답들 = page.getByRole('tabpanel').getByRole('paragraph');
    this.검색칸 = page.getByLabel('FAQ 검색');
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.검색결과없음 = page.getByText('검색 결과가 없습니다', { exact: true });
    this.오시는길제목 = page.getByRole('heading', { name: '오시는 길', level: 2 });
    this.지도틀 = page.getByTitle('오시는 길 지도');
    this.지도 = page.frameLocator('iframe[title="오시는 길 지도"]');
    this.지도그림 = this.지도.getByRole('img', { name: '데모마켓 위치 지도' });
    this.확대버튼 = this.지도.getByRole('button', { name: '확대', exact: true });
    this.축소버튼 = this.지도.getByRole('button', { name: '축소', exact: true });
    this.배율 = this.지도.getByRole('status');
  }

  분류탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/support');
    await this.제목.waitFor();
    await this.머리글.로고.waitFor();
    await this.질문들.first().waitFor();
    await this.상담.열기버튼.waitFor();
  }

  async 질문글들(): Promise<string[]> {
    return this.질문들.evaluateAll((질문들) => 질문들.map((질문) => (질문.textContent ?? '').replace(/[＋－]$/, '').trim()));
  }

  async 펼친질문글들(): Promise<string[]> {
    return this.질문들.evaluateAll((질문들) =>
      질문들.filter((질문) => 질문.getAttribute('aria-expanded') === 'true').map((질문) => (질문.textContent ?? '').replace(/[＋－]$/, '').trim()),
    );
  }

  async 선택됨(이름: string): Promise<boolean> {
    return (await this.분류탭(이름).getAttribute('aria-selected')) === 'true';
  }

  async 항목마다검색어가들었나(글: string): Promise<boolean> {
    return this.질문들.evaluateAll(
      (질문들, 찾는글) => 질문들.length > 0 && 질문들.every((질문) => (질문.closest('li')?.textContent ?? '').includes(찾는글)),
      글,
    );
  }

  async 배율숫자(): Promise<number> {
    return Number(/\d+/.exec(await this.배율.innerText())?.[0] ?? Number.NaN);
  }

  async 지도틀이FAQ아래인가(): Promise<boolean> {
    const 틀 = await this.지도틀.boundingBox();
    const 탭 = await this.분류탭('회원').boundingBox();
    if (!틀 || !탭) return false;
    return 틀.y > 탭.y;
  }
}
