import type { Locator, Page } from '@playwright/test';

import { 창 } from '../components/modal.component.js';
import { 운영틀 } from '../components/ops-shell.component.js';
import { 토스트 } from '../components/toast.component.js';

export class 점검화면 {
  static readonly 주소 = '/maintenance';

  readonly 틀: 운영틀;
  readonly 알림: 토스트;
  readonly 창: 창;
  readonly 제목: Locator;
  readonly 준비표시: Locator;
  readonly 상태줄: Locator;
  readonly 상태칩: Locator;
  readonly 변경줄: Locator;
  readonly 켜기: Locator;
  readonly 안내칸: Locator;
  readonly 시작칸: Locator;
  readonly 끝칸: Locator;
  readonly 허용칸: Locator;
  readonly 저장버튼: Locator;
  readonly 폼안내: Locator;
  private 보낸저장 = 0;

  constructor(private readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.알림 = new 토스트(page);
    this.창 = new 창(page);
    this.제목 = this.틀.본문.getByRole('heading', { level: 1, name: '점검', exact: true });
    this.준비표시 = page.locator('#mt-form');
    this.상태줄 = this.틀.본문.locator('.ops-ok');
    this.상태칩 = this.상태줄.locator('.status');
    this.변경줄 = this.상태줄.getByText(/^(마지막 변경 .+|아직 바꾼 적 없음)$/);
    this.켜기 = page.getByRole('checkbox', { name: '점검 켜기', exact: true });
    this.안내칸 = page.getByLabel('게임에 보일 안내 (켤 때 1~300자)', { exact: true });
    this.시작칸 = page.getByLabel('시작 (비우면 바로)', { exact: true });
    this.끝칸 = page.getByLabel('끝 (비우면 끌 때까지)', { exact: true });
    this.허용칸 = page.getByLabel('점검 중에도 들어올 게임 계정 번호 (쉼표로)', { exact: true });
    this.저장버튼 = page.getByRole('button', { name: '저장', exact: true });
    this.폼안내 = page.getByText('점검 중에는 비밀번호가 맞아도 로그인 응답이 503(MAINTENANCE)입니다. 이미 접속한 유저는 게임 서버가 처리합니다.', { exact: true });
    page.on('request', (요청) => {
      if (요청.method() === 'PUT' && new URL(요청.url()).pathname === '/api/ops/maintenance') this.보낸저장 += 1;
    });
  }

  get 저장요청수(): number {
    return this.보낸저장;
  }

  async 열기(뒤?: string): Promise<void> {
    await this.page.goto(뒤 === undefined ? 점검화면.주소 : `${점검화면.주소}${뒤}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.준비표시.waitFor();
  }

  async 켜기고르기(켬: boolean): Promise<void> {
    await this.켜기.setChecked(켬);
  }

  async 안내적기(글: string): Promise<void> {
    await this.안내칸.fill(글);
  }

  async 시작정하기(값: string): Promise<void> {
    await this.시작칸.fill(값);
  }

  async 끝정하기(값: string): Promise<void> {
    await this.끝칸.fill(값);
  }

  async 허용적기(값: string): Promise<void> {
    await this.허용칸.fill(값);
  }

  async 저장누르기(): Promise<void> {
    await this.저장버튼.click();
  }

  async 확인창넘기기(버튼: '점검 켜기' | '점검 끄기' | '닫기'): Promise<boolean> {
    const 열림 = await this.창.열릴때까지();
    if (열림) await this.창.누르기(버튼);
    return 열림;
  }
}
