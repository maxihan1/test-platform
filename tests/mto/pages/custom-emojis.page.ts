import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 커스텀에모지화면 {
  static readonly 주소 = '/admin/custom_emojis';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 업로드: Locator;
  readonly 전체필터: Locator;
  readonly 로컬필터: Locator;
  readonly 리모트필터: Locator;
  readonly 짧은코드칸: Locator;
  readonly 도메인칸: Locator;
  readonly 검색: Locator;
  readonly 활성화: Locator;
  readonly 비활성화: Locator;
  readonly 삭제: Locator;
  readonly 복사: Locator;
  readonly 목록에추가: Locator;
  readonly 목록에서제거: Locator;
  readonly 에모지줄들: Locator;
  readonly 빈결과: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '커스텀 에모지', level: 1 });
    this.알림 = new 알림(page);
    this.업로드 = page.getByRole('link', { name: '업로드', exact: true });
    this.전체필터 = page.getByRole('link', { name: '전체', exact: true });
    this.로컬필터 = page.getByRole('link', { name: '로컬', exact: true });
    this.리모트필터 = page.getByRole('link', { name: '리모트', exact: true });
    this.짧은코드칸 = page.getByRole('textbox', { name: '짧은 코드' });
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.검색 = page.getByRole('button', { name: '검색' });
    this.활성화 = page.getByRole('button', { name: '활성화', exact: true });
    this.비활성화 = page.getByRole('button', { name: '비활성화', exact: true });
    this.삭제 = page.getByRole('button', { name: '삭제', exact: true });
    this.복사 = page.getByRole('button', { name: '복사', exact: true });
    this.목록에추가 = page.getByRole('button', { name: '목록에 추가' });
    this.목록에서제거 = page.getByRole('button', { name: '목록에서 제거' });
    this.에모지줄들 = page.locator('.batch-table__row');
    this.빈결과 = page.getByText('아무 것도 없습니다!');
  }

  async 열기(): Promise<void> {
    await this.page.goto(커스텀에모지화면.주소);
    await this.제목.waitFor();
    await this.업로드.waitFor();
  }

  async 로컬열기(): Promise<void> {
    await this.열기();
    await this.로컬필터.click();
    await this.목록에추가.waitFor();
  }

  에모지줄(코드: string): Locator {
    return this.에모지줄들.filter({ has: this.page.locator('samp', { hasText: new RegExp(`^:${코드}:$`) }) });
  }

  목록에없음표시(코드: string): Locator {
    return this.에모지줄(코드).filter({ hasText: '목록에 없음' });
  }

  비활성표시(코드: string): Locator {
    return this.에모지줄(코드).filter({ hasText: '비활성' });
  }

  끝나는알림(끝글: string): Locator {
    return this.알림.모두.filter({ hasText: new RegExp(`${끝글}\\s*$`) });
  }

  선택칸(코드: string): Locator {
    return this.에모지줄(코드).getByRole('checkbox');
  }

  async 코드검색(코드: string): Promise<void> {
    await this.짧은코드칸.fill(코드);
    await this.검색.click();
  }

  async 선택해서누르기(코드: string, 버튼: Locator): Promise<void> {
    await this.선택칸(코드).check();
    this.page.once('dialog', (창) => void 창.accept());
    await 버튼.click();
  }
}
