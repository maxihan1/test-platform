import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 토스트 } from '../components/feedback.component.js';

export class 게시판목록화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 표: Locator;
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;
  readonly 토스트: 토스트;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '커뮤니티', level: 1 });
    this.머리글 = new 머리글(page);
    this.표 = page.getByRole('table');
    this.검색어칸 = page.getByRole('searchbox', { name: '검색어' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.토스트 = new 토스트(page);
  }

  분류탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/board');
    await this.제목.waitFor();
    await this.표.waitFor();

    await this.머리글.로고.waitFor();
  }

  async 검색하기(글: string): Promise<void> {
    await this.검색어칸.fill(글);
    await this.검색버튼.click();
  }

  async 선택됨(이름: string): Promise<boolean> {
    return (await this.분류탭(이름).getAttribute('aria-selected')) === 'true';
  }

  async 토스트위치(): Promise<{ 가운데: boolean; 아래: boolean }> {
    const 창 = this.page.viewportSize();
    const 상자 = await this.토스트.전부.first().boundingBox();
    if (!창 || !상자) throw new Error('토스트 위치를 읽지 못했다');
    const 가로중심 = 상자.x + 상자.width / 2;
    return { 가운데: Math.abs(가로중심 - 창.width / 2) < 창.width * 0.1, 아래: 상자.y + 상자.height / 2 > 창.height / 2 };
  }
}
