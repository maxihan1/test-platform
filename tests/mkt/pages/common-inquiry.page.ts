import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 토스트 } from '../components/feedback.component.js';
import type { 올릴파일 } from '../components/files.component.js';

export class 일대일문의화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 토스트: 토스트;
  readonly 유형칸: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 첨부칸: Locator;
  readonly 이메일체크박스: Locator;
  readonly 등록버튼: Locator;
  readonly 글자수: Locator;
  readonly 내역: Locator;
  readonly 내역행들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '1:1 문의', level: 1 });
    this.머리글 = new 머리글(page);
    this.토스트 = new 토스트(page);
    this.유형칸 = page.getByRole('combobox', { name: /^유형/ });
    this.제목칸 = page.getByRole('textbox', { name: /^제목/ });
    this.내용칸 = page.getByRole('textbox', { name: /^내용/ });
    this.첨부칸 = page.getByLabel(/첨부 파일/);
    this.이메일체크박스 = page.getByRole('checkbox', { name: '답변 알림 이메일 받기', exact: true });
    this.등록버튼 = page.getByRole('button', { name: '등록', exact: true });
    this.글자수 = page.getByText(/^\d+\/1000$/);
    this.내역 = page.getByRole('region', { name: '내 문의 내역', exact: true });
    this.내역행들 = this.내역.getByRole('row');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/support/inquiry');
    await this.제목.waitFor();
    await this.머리글.로그인됐나기다리기();
    await this.내역.getByRole('heading', { name: '내 문의 내역' }).waitFor();
    await this.내역.locator('p.empty-state, table').first().waitFor();
  }

  async 유형옵션들(): Promise<string[]> {
    return this.유형칸.getByRole('option').allInnerTexts();
  }

  async 글자채우기(칸: Locator, 글: string): Promise<void> {
    await 칸.fill('');
    await 칸.focus();
    await this.page.keyboard.insertText(글);
  }

  async 제목적기(글: string): Promise<void> {
    await this.글자채우기(this.제목칸, 글);
  }

  async 내용적기(글: string): Promise<void> {
    await this.글자채우기(this.내용칸, 글);
  }

  async 칸글자수(칸: Locator): Promise<number> {
    return (await 칸.inputValue()).length;
  }

  async 첨부파일수(): Promise<number> {
    return this.첨부칸.evaluate((칸) => (칸 as HTMLInputElement).files?.length ?? 0);
  }

  async 파일고르기(파일: 올릴파일): Promise<void> {
    await this.첨부칸.setInputFiles(파일);
  }

  async 내역건수(): Promise<number> {
    const 행들 = await this.내역행들.count();
    return Math.max(0, 행들 - 1);
  }

  async 내역첫줄(): Promise<string[]> {
    return this.내역행들.nth(1).getByRole('cell').allInnerTexts();
  }

  async 내용칸아래에글자수가있나(): Promise<boolean> {
    const 칸 = await this.내용칸.boundingBox();
    const 수 = await this.글자수.boundingBox();
    if (!칸 || !수) return false;
    return 수.y >= 칸.y + 칸.height - 2;
  }
}
