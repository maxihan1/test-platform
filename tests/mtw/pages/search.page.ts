import type { Locator, Page } from '@playwright/test';

import { 로그인안내창 } from '../components/interaction-modal.component.js';

export class 검색화면 {
  static readonly 주소 = '/search';

  readonly 안내창: 로그인안내창;
  readonly 검색칸: Locator;
  readonly 팝업: Locator;
  readonly 최근검색: Locator;
  readonly 검색옵션: Locator;
  readonly 빠른작업: Locator;
  readonly 결과제목: Locator;
  readonly 결과영역: Locator;
  readonly 결과없음: Locator;

  constructor(private readonly page: Page) {
    this.안내창 = new 로그인안내창(page);
    this.검색칸 = page.getByRole('search').getByRole('textbox');
    this.팝업 = page.getByRole('dialog', { name: '검색 옵션' });
    this.최근검색 = this.팝업.getByRole('heading', { name: '최근 검색' });
    this.검색옵션 = this.팝업.getByRole('heading', { name: '검색 옵션' });
    this.빠른작업 = this.팝업.getByRole('heading', { name: '빠른 작업' });
    this.결과제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.결과영역 = page.getByRole('main').getByRole('region');
    this.결과없음 = page.getByRole('main').getByText('결과가 없습니다.');
  }

  async 열기(검색어: string, 종류?: string): Promise<void> {
    await this.page.goto(`${검색화면.주소}?q=${encodeURIComponent(검색어)}${종류 === undefined ? '' : `&type=${종류}`}`);
    await this.결과제목.waitFor();
  }

  async 결과기다리기(): Promise<void> {
    await this.결과없음.or(this.page.getByRole('main').getByRole('article')).first().waitFor();
  }

  async 결과없음뿐인가(): Promise<boolean> {
    return (await this.결과없음.isVisible()) && (await this.page.getByRole('main').getByRole('article').count()) === 0;
  }

  결과글(문구: string | RegExp): Locator {
    return this.결과영역.getByText(문구);
  }

  팝업글(문구: string | RegExp): Locator {
    return this.팝업.getByText(문구);
  }

  빠른작업항목(이름: string | RegExp): Locator {
    return this.팝업.getByRole('button', { name: 이름 });
  }

  탭(이름: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: 이름, exact: true });
  }

  결과줄(아이디: string): Locator {
    return this.결과영역.getByRole('link', { name: new RegExp(`@${아이디}`) });
  }

  결과줄팔로우(아이디: string): Locator {
    return this.결과영역
      .getByRole('article')
      .filter({ has: this.page.getByRole('link', { name: new RegExp(`@${아이디}`) }) })
      .getByRole('button', { name: /^팔로우$|^언팔로우$/ })
      .first();
  }

  async 단축키누르기(키: string): Promise<void> {
    await this.page.locator('body').press(키);
  }

  async 커서가있는가(): Promise<boolean> {
    return this.검색칸.evaluate((칸) => 칸 === document.activeElement);
  }

  async 안내창닫기(): Promise<void> {
    if ((await this.안내창.창.count()) === 0) return;
    await this.page.keyboard.press('Escape');
    await this.안내창.창.waitFor({ state: 'detached' });
  }

  async 태그로갔나(태그: string): Promise<boolean> {
    return this.page.waitForURL((u) => decodeURIComponent(u.pathname) === `/tags/${태그}`, { timeout: 10_000 }).then(() => true, () => false);
  }

  async 프로필로갔나(아이디: string): Promise<boolean> {
    return this.page.waitForURL((u) => decodeURIComponent(u.pathname) === `/@${아이디}`, { timeout: 10_000 }).then(() => true, () => false);
  }

  async 팝업열기(): Promise<void> {
    await this.검색칸.click();
    await this.팝업.waitFor();
  }

  async 넣기(검색어: string): Promise<void> {
    await this.검색칸.fill(검색어);
    await this.빠른작업.waitFor();
  }

  async 찾기(검색어: string): Promise<void> {
    await this.검색칸.fill(검색어);
    await this.검색칸.press('Enter');
  }
}
