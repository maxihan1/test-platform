import type { Locator, Page } from '@playwright/test';
import { 게시판검색 } from '../components/board-search.component.js';

export class FAQ목록화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 검색: 게시판검색;
  readonly 올인원탭: Locator;
  readonly 네이티브탭: Locator;
  readonly 골라진올인원탭: Locator;
  readonly 골라진네이티브탭: Locator;
  readonly 카테고리선택: Locator;
  readonly 질문들: Locator;
  readonly 펼쳐진질문들: Locator;
  readonly 결과없음문구: Locator;
  private readonly 본문: Locator;

  constructor(page: Page) {
    this.page = page;
    this.본문 = page.getByRole('main');
    this.제목 = this.본문.getByRole('heading', { name: 'FAQ', level: 1 });
    this.검색 = new 게시판검색(page);
    this.올인원탭 = this.본문.getByRole('button', { name: 'AI 올인원', exact: true });
    this.네이티브탭 = this.본문.getByRole('button', { name: 'AI 네이티브', exact: true });
    this.골라진올인원탭 = this.본문.locator('button.tab-item.active', { hasText: 'AI 올인원' });
    this.골라진네이티브탭 = this.본문.locator('button.tab-item.active', { hasText: 'AI 네이티브' });
    this.카테고리선택 = this.본문.getByRole('combobox');
    this.질문들 = this.본문.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3 }) });
    this.펼쳐진질문들 = this.본문.locator('li.post-item.active');
    this.결과없음문구 = this.본문.getByText('검색 결과가 없습니다.');
  }

  async 연다(): Promise<void> {
    await this.page.goto('/board/faqGoList');
  }

  질문(제목: string): Locator {
    return this.질문들.filter({ has: this.page.getByRole('heading', { name: 제목, exact: true }) });
  }

  답변(제목: string): Locator {
    return this.질문(제목).locator('.post-content');
  }

  카테고리(이름: string): Locator {
    return this.카테고리선택.getByRole('option', { name: 이름, exact: true });
  }

  카테고리가이름인질문들(이름: string): Locator {
    return this.질문들.filter({ has: this.page.getByText(이름, { exact: true }) });
  }

  async 질문을누른다(제목: string): Promise<void> {
    await this.질문(제목).getByRole('heading', { name: 제목, exact: true }).click();
  }

  async 카테고리를고른다(이름: string): Promise<void> {
    await this.카테고리선택.selectOption({ label: 이름 });
  }
}
