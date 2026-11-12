import type { Locator, Page } from '@playwright/test';

export class 해시태그목록화면 {
  static readonly 주소 = '/admin/tags';

  readonly 제목: Locator;
  readonly 관리선택: Locator;
  readonly 정렬선택: Locator;
  readonly 정렬항목들: Locator;
  readonly 이름칸: Locator;
  readonly 검색: Locator;
  readonly 초기화: Locator;
  readonly 빈목록: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '해시태그', level: 1 });
    this.관리선택 = page.locator('.filter-subset').filter({ has: page.getByText('관리', { exact: true }) }).locator('select');
    this.정렬선택 = page.locator('#order');
    this.정렬항목들 = this.정렬선택.getByRole('option');
    this.이름칸 = page.getByPlaceholder('이름');
    this.검색 = page.getByRole('button', { name: '검색' });
    this.초기화 = page.getByRole('link', { name: '초기화' });
    this.빈목록 = page.getByText('아무 것도 없습니다!');
  }

  async 열기(): Promise<void> {
    await this.page.goto(해시태그목록화면.주소);
    await this.제목.waitFor();
    await this.초기화.waitFor();
  }

  행링크(이름: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(`^#${이름}$`, 'i') });
  }

  async 이름으로찾기(이름: string): Promise<void> {
    await this.page.goto(`${해시태그목록화면.주소}?name=${encodeURIComponent(이름)}`);
    await this.제목.waitFor();
    await this.행링크(이름).or(this.빈목록).first().waitFor();
  }
}
