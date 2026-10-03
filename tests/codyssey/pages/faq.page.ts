import type { Locator, Page } from '@playwright/test';

import { 머리 } from '../components/header.component.js';

export class FAQ화면 {
  private readonly 머리부: 머리;

  constructor(private readonly page: Page) {
    this.머리부 = new 머리(page);
  }

  private get 본문(): Locator {
    return this.page.getByRole('main');
  }

  get 검색어칸(): Locator {
    return this.page.getByPlaceholder('검색어를 입력하세요.');
  }

  get 검색버튼(): Locator {
    return this.본문.getByRole('button', { name: '검색', exact: true });
  }

  get 카테고리선택상자(): Locator {
    return this.본문.getByRole('combobox');
  }

  get 질문제목들(): Locator {
    return this.본문.getByRole('heading', { level: 3 });
  }

  get 첫질문제목(): Locator {
    return this.질문제목들.first();
  }

  get 질문항목들(): Locator {
    return this.본문.getByRole('listitem').filter({ has: this.page.getByRole('heading', { level: 3 }) });
  }

  get 첫질문의답(): Locator {
    return this.질문항목들.first().getByRole('paragraph').filter({ hasText: /\S/ }).first();
  }

  구분버튼(이름: string): Locator {
    return this.본문.getByRole('button', { name: 이름, exact: true });
  }

  선택된카테고리(이름: string): Locator {
    return this.카테고리선택상자.getByRole('option', { name: 이름, selected: true });
  }

  질문제목(제목: string): Locator {
    return this.본문.getByRole('heading', { level: 3, name: 제목, exact: true });
  }

  카테고리가같은질문항목들(카테고리: string): Locator {
    return this.질문항목들.filter({ has: this.page.getByText(카테고리, { exact: true }) });
  }

  카테고리가다른질문항목들(카테고리: string): Locator {
    return this.질문항목들.filter({ hasNot: this.page.getByText(카테고리, { exact: true }) });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/board/faqGoList');
    await this.머리부.메뉴('알림마당').waitFor();
  }

  async 보이는구분버튼(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.구분버튼(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 첫질문제목을누른다(): Promise<void> {
    await this.첫질문제목.click();
  }

  async 카테고리가다른첫질문제목(카테고리: string): Promise<string> {
    await this.첫질문제목.waitFor();
    const 다른항목들 = this.카테고리가다른질문항목들(카테고리);
    if ((await 다른항목들.count()) === 0) {
      throw new Error(`검색 전 목록에 「${카테고리}」가 아닌 질문이 없어 검색이 목록을 거르는지 알 수 없다`);
    }
    return 다른항목들.first().getByRole('heading', { level: 3 }).innerText();
  }

  async 카테고리를고른다(카테고리: string): Promise<void> {
    await this.카테고리선택상자.selectOption({ label: 카테고리 });
  }

  async 검색한다(): Promise<void> {
    await this.검색버튼.click();
  }
}
