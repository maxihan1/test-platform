import type { Locator, Page } from '@playwright/test';

export class 할일화면 {
  static readonly 주소 = '/todomvc';

  readonly 제목: Locator;
  readonly 입력칸: Locator;
  readonly 바닥글안내: Locator;
  readonly 목록줄: Locator;
  readonly 할일이름: Locator;
  readonly 완료한줄: Locator;
  readonly 남은개수: Locator;
  readonly 완료지우기: Locator;
  readonly 모두완료: Locator;
  readonly 고치기칸: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'todos' });
    this.입력칸 = page.getByPlaceholder('What needs to be done?');
    this.바닥글안내 = page.getByRole('contentinfo').getByText('Double-click to edit a todo', { exact: true });
    this.목록줄 = page.getByTestId('todo-item');
    this.할일이름 = page.getByTestId('todo-title');
    this.완료한줄 = this.목록줄.and(page.locator('.completed'));
    this.남은개수 = page.getByTestId('todo-count');
    this.완료지우기 = page.getByRole('button', { name: 'Clear completed' });
    this.모두완료 = page.getByRole('checkbox', { name: 'Mark all as complete' });
    this.고치기칸 = page.getByRole('textbox', { name: 'Edit' });
  }

  보기링크(이름: 'All' | 'Active' | 'Completed'): Locator {
    return this.page.getByRole('link', { name: 이름, exact: true });
  }

  고른보기링크(이름: 'All' | 'Active' | 'Completed'): Locator {
    return this.page.locator('a.selected').getByText(이름, { exact: true });
  }

  줄(이름: string): Locator {
    return this.목록줄.filter({ has: this.page.getByText(이름, { exact: true }) });
  }

  고치는줄(이름: string): Locator {
    return this.줄(이름).and(this.page.locator('.editing'));
  }

  완료표시(이름: string): Locator {
    return this.줄(이름).getByRole('checkbox', { name: 'Toggle Todo' });
  }

  지우기버튼(이름: string): Locator {
    return this.줄(이름).getByRole('button', { name: 'Delete' });
  }

  남은개수글(글: string): Locator {
    return this.남은개수.filter({ hasText: 글 });
  }

  async 열기(): Promise<void> {
    await this.page.goto(할일화면.주소);
    await this.입력칸.waitFor();
  }

  async 보기주소열기(경로: '#/active' | '#/completed'): Promise<void> {
    await this.page.goto(`${할일화면.주소}/${경로}`);
    await this.page.reload();
    await this.입력칸.waitFor();
  }

  async 다시열기(): Promise<void> {
    await this.page.reload();
    await this.입력칸.waitFor();
  }

  async 적고엔터(글: string): Promise<void> {
    await this.입력칸.fill(글);
    await this.입력칸.press('Enter');
  }

  async 더하기(이름: string): Promise<void> {
    await this.적고엔터(이름);
    await this.줄(이름).waitFor();
  }

  async 완료누르기(이름: string): Promise<void> {
    await this.완료표시(이름).click();
  }

  async 모두완료누르기(): Promise<void> {
    await this.page.getByText('Mark all as complete').click();
  }

  async 보기고르기(이름: 'All' | 'Active' | 'Completed'): Promise<void> {
    await this.보기링크(이름).click();
  }

  async 이름두번누르기(이름: string): Promise<void> {
    await this.줄(이름).getByTestId('todo-title').dblclick();
  }

  async 고치기열기(이름: string): Promise<void> {
    await this.이름두번누르기(이름);
    await this.고치기칸.waitFor();
  }

  async 고치기칸에적기(글: string): Promise<void> {
    await this.고치기칸.fill(글);
  }

  async 고치기칸키(키: 'Enter' | 'Escape'): Promise<void> {
    await this.고치기칸.press(키);
  }

  async 제목누르기(): Promise<void> {
    await this.제목.click();
  }

  async 줄에마우스(이름: string): Promise<void> {
    await this.줄(이름).hover();
  }

  async 지우기누르기(이름: string): Promise<void> {
    await this.줄(이름).hover();
    await this.지우기버튼(이름).click();
  }

  async 완료로보이는가(이름: string): Promise<boolean> {
    return /\bcompleted\b/.test((await this.줄(이름).getAttribute('class')) ?? '');
  }

  async 고른보기인가(이름: 'All' | 'Active' | 'Completed'): Promise<boolean> {
    return /\bselected\b/.test((await this.보기링크(이름).getAttribute('class')) ?? '');
  }

  async 이름들(): Promise<string[]> {
    return this.할일이름.allInnerTexts();
  }

  async 다시그려질때까지(): Promise<void> {
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }
}
