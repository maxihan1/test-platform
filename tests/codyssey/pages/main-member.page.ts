import type { Locator, Page } from '@playwright/test';

import { 머리 } from '../components/header.component.js';
import { 제목 } from '../components/title.component.js';

export class 회원메인화면 {
  private readonly 머리부: 머리;
  private readonly 제목부: 제목;

  constructor(private readonly page: Page) {
    this.머리부 = new 머리(page);
    this.제목부 = new 제목(page);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/main/');
  }

  get 사용자이름(): Locator {
    return this.머리부.영역.getByRole('strong');
  }

  get 설정버튼(): Locator {
    return this.머리부.영역.getByRole('button');
  }

  설정메뉴(이름: string): Locator {
    return this.머리부.영역.getByRole('button', { name: 이름, exact: true });
  }

  타일(이름: string): Locator {
    return this.page.getByRole('main').getByText(이름, { exact: true });
  }

  타일버튼(타일이름: string, 버튼이름: string): Locator {
    return this.page
      .getByRole('main')
      .locator('div:has(> strong):has(> button)')
      .filter({ has: this.page.getByText(타일이름, { exact: true }) })
      .getByRole('button', { name: 버튼이름, exact: true });
  }

  get 공지사항머리글(): Locator {
    return this.제목부.소제목('공지사항');
  }

  get FAQ머리글(): Locator {
    return this.제목부.중제목('FAQ');
  }

  async 보이는타일(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.타일(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 보이는설정메뉴(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.설정메뉴(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 사용자이름을누른다(): Promise<void> {
    await this.사용자이름.click();
  }

  async 설정버튼을누른다(): Promise<void> {
    await this.설정버튼.click();
  }

  async 로그아웃을누른다(): Promise<void> {
    await this.설정메뉴('로그아웃').click();
  }

  async 타일버튼을누른다(타일이름: string, 버튼이름: string): Promise<void> {
    await this.타일버튼(타일이름, 버튼이름).click();
  }
}
