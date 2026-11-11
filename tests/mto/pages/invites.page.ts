import type { Locator, Page } from '@playwright/test';

export class 초대화면 {
  static readonly 주소 = '/admin/invites';

  readonly 제목: Locator;
  readonly 모두: Locator;
  readonly 사용가능: Locator;
  readonly 만료됨: Locator;
  readonly 설명: Locator;
  readonly 사용횟수제한: Locator;
  readonly 만기: Locator;
  readonly 초대를통한팔로우: Locator;
  readonly 생성: Locator;
  readonly 전부비활성화: Locator;
  readonly 코멘트칸: Locator;
  readonly 중재메뉴링크: Locator;
  readonly 링크칸들: Locator;
  readonly 행들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '초대', level: 1, exact: true });
    this.모두 = page.getByRole('link', { name: '모두', exact: true });
    this.사용가능 = page.getByRole('link', { name: '사용가능', exact: true });
    this.만료됨 = page.getByRole('link', { name: '만료됨', exact: true });
    this.설명 = page.getByText('이 서버에 대한 초대 링크를 만들고 공유합니다');
    this.사용횟수제한 = page.getByRole('combobox', { name: '사용 횟수 제한' });
    this.만기 = page.getByRole('combobox', { name: '만기' });
    this.초대를통한팔로우 = page.getByRole('checkbox', { name: '초대를 통한 팔로우' });
    this.생성 = page.getByRole('button', { name: '초대 링크 생성하기' });
    this.전부비활성화 = page.getByRole('link', { name: '전부 비활성화' });
    this.중재메뉴링크 = page.locator('a[href="/admin/invites"]');
    this.코멘트칸 = page.getByRole('textbox', { name: '코멘트' });
    this.링크칸들 = page.getByRole('row').getByRole('textbox');
    this.행들 = page.getByRole('row');
  }

  async 열기(): Promise<void> {
    await this.page.goto(초대화면.주소);
    await this.제목.waitFor();
    await this.생성.waitFor();
  }

  async 링크들(): Promise<string[]> {
    return this.링크칸들.evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).value));
  }

  async 생성하기(횟수: string): Promise<string> {
    const 이전 = await this.링크들();
    await this.사용횟수제한.selectOption({ label: 횟수 });
    await this.생성.click();
    await this.링크칸들.nth(이전.length).waitFor();
    const 이후 = await this.링크들();
    return 이후.find((링크) => !이전.includes(링크)) ?? '';
  }

  async 코멘트로생성하기(글자수: number): Promise<string> {
    const 이전 = await this.링크들();
    await this.코멘트칸.fill('가'.repeat(글자수));
    await this.생성.click();
    await this.page.waitForLoadState('load');
    const 이후 = await this.링크들();
    return 이후.find((링크) => !이전.includes(링크)) ?? '';
  }

  행(링크: string): Locator {
    return this.page.getByRole('row', { name: 링크.split('/').pop() ?? 링크 });
  }

  링크칸(링크: string): Locator {
    return this.행(링크).getByRole('textbox');
  }

  복사(링크: string): Locator {
    return this.행(링크).getByRole('button', { name: '복사' });
  }

  이용수(링크: string, 글: string): Locator {
    return this.행(링크).getByText(글, { exact: true });
  }

  비활성화링크(링크: string): Locator {
    return this.행(링크).getByRole('link', { name: '비활성화' });
  }

  만료표시(링크: string): Locator {
    return this.행(링크).getByText('만료됨');
  }

  async 비활성화하기(링크: string): Promise<void> {
    const 줄 = this.행(링크);
    await 줄.getByRole('link', { name: '비활성화' }).click();
    await this.page.waitForLoadState('load');
    await 줄.getByRole('link', { name: '비활성화' }).waitFor({ state: 'hidden' });
  }
}
