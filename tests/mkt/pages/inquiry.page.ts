import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 문의화면 {
  static readonly 주소 = '/support/inquiry';
  readonly 제목: Locator;
  readonly 유형칸: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 글자수: Locator;
  readonly 첨부칸: Locator;
  readonly 알림체크: Locator;
  readonly 등록버튼: Locator;
  readonly 내역제목: Locator;
  readonly 내역표: Locator;
  readonly 내역줄들: Locator;
  readonly 내역없음: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.제목 = page.getByRole('heading', { name: '1:1 문의', level: 1 });
    this.유형칸 = 본문.getByLabel('유형', { exact: true });
    this.제목칸 = 본문.getByLabel('제목', { exact: true });
    this.내용칸 = 본문.getByLabel('내용', { exact: true });
    this.글자수 = 본문.getByText(/^\d+\/1000$/);
    this.첨부칸 = 본문.getByLabel('첨부 파일 (1개, 10MB 이하)');
    this.알림체크 = 본문.getByRole('checkbox', { name: '답변 알림 이메일 받기' });
    this.등록버튼 = 본문.getByRole('button', { name: '등록', exact: true });
    this.내역제목 = 본문.getByRole('heading', { name: '내 문의 내역', level: 2 });
    this.내역표 = 본문.getByRole('table');
    this.내역줄들 = this.내역표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.내역없음 = 본문.getByText('문의 내역이 없습니다');
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(문의화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.내역줄들.first().or(this.내역없음).waitFor();
  }

  async 유형고르기(유형: string): Promise<void> {
    await this.유형칸.selectOption({ label: 유형 });
  }

  async 제목쓰기(글: string): Promise<void> {
    await this.제목칸.fill(글);
  }

  async 내용쓰기(글: string): Promise<void> {
    await this.내용칸.fill(글);
  }

  async 채우기(유형: string, 제목: string, 내용: string): Promise<void> {
    await this.유형고르기(유형);
    await this.제목쓰기(제목);
    await this.내용쓰기(내용);
  }

  async 등록누르기(): Promise<void> {
    await this.등록버튼.click();
  }

  async 등록빠르게두번누르기(): Promise<void> {
    await this.등록버튼.dblclick();
  }

  async 파일첨부하기(바이트: number): Promise<void> {
    await this.첨부칸.setInputFiles({ name: 'attach.txt', mimeType: 'text/plain', buffer: Buffer.alloc(바이트, 97) });
  }

  async 첨부파일수(): Promise<number> {
    return this.첨부칸.evaluate((칸) => (칸 as HTMLInputElement).files?.length ?? 0);
  }

  async 유형목록(): Promise<string[]> {
    return this.유형칸.getByRole('option').allInnerTexts();
  }

  async 문의수(): Promise<number> {
    return this.내역줄들.count();
  }

  async 내역제목들(): Promise<string[]> {
    const 줄수 = await this.내역줄들.count();
    const 제목들: string[] = [];
    for (let i = 0; i < 줄수; i++) {
      const 칸 = await this.내역줄들.nth(i).getByRole('cell').allInnerTexts();
      제목들.push(칸[1] ?? '');
    }
    return 제목들;
  }

  async 내역상태들(): Promise<string[]> {
    const 줄수 = await this.내역줄들.count();
    const 상태들: string[] = [];
    for (let i = 0; i < 줄수; i++) {
      const 칸 = await this.내역줄들.nth(i).getByRole('cell').allInnerTexts();
      상태들.push(칸[3] ?? '');
    }
    return 상태들;
  }
}
