import type { Locator, Page } from '@playwright/test';

import { 머리 } from '../components/header.component.js';

export class 공지사항화면 {
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

  get 등록일칸(): Locator {
    return this.page.getByPlaceholder('YYYY.MM.DD ~ YYYY.MM.DD');
  }

  get 검색버튼(): Locator {
    return this.본문.getByRole('button', { name: '검색', exact: true });
  }

  get 이전버튼(): Locator {
    return this.본문.getByRole('button', { name: '이전', exact: true });
  }

  get 다음버튼(): Locator {
    return this.본문.getByRole('button', { name: '다음', exact: true });
  }

  get 공지제목들(): Locator {
    return this.본문.getByRole('heading', { level: 3 });
  }

  get 첫공지제목(): Locator {
    return this.공지제목들.first();
  }

  get 검색결과없음문구(): Locator {
    return this.본문.getByText('검색결과가 없습니다.', { exact: true });
  }

  공지제목(제목: string): Locator {
    return this.본문.getByRole('heading', { level: 3, name: 제목, exact: true });
  }

  검색어가든공지제목(검색어: string): Locator {
    return this.공지제목들.filter({ hasText: 검색어 });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/board/noticeGoList');
    await this.머리부.메뉴('알림마당').waitFor();
  }

  async 공지제목글자들(): Promise<string[]> {
    return this.공지제목들.allInnerTexts();
  }

  async 첫공지제목글자(): Promise<string> {
    await this.첫공지제목.waitFor();
    return this.첫공지제목.innerText();
  }

  async 첫공지제목을누른다(): Promise<void> {
    await this.첫공지제목.click();
  }

  async 검색어가없는첫제목(검색어: string): Promise<string> {
    await this.첫공지제목.waitFor();
    const 제목들 = this.공지제목들.filter({ hasNotText: 검색어 });
    if ((await 제목들.count()) === 0) {
      throw new Error(`검색 전 목록에 「${검색어}」가 들어 있지 않은 제목이 없어 검색이 목록을 거르는지 알 수 없다`);
    }
    return 제목들.first().innerText();
  }

  async 검색한다(검색어: string): Promise<void> {
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }
}
