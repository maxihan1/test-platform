import type { Locator, Page } from '@playwright/test';

export class 도메인차단폼화면 {
  static readonly 주소 = '/admin/domain_blocks/new';

  readonly 제목: Locator;
  readonly 도메인칸: Locator;
  readonly 심각도: Locator;
  readonly 미디어파일거부: Locator;
  readonly 신고거부: Locator;
  readonly 도메인이름난독화: Locator;
  readonly 비공개주석: Locator;
  readonly 공개주석: Locator;
  readonly 차단추가: Locator;
  readonly 도메인오류: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '새로운 도메인 차단', level: 1 });
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.심각도 = page.getByRole('combobox', { name: '심각도' });
    this.미디어파일거부 = page.getByRole('checkbox', { name: '미디어 파일 거부하기' });
    this.신고거부 = page.getByRole('checkbox', { name: '신고 거부' });
    this.도메인이름난독화 = page.getByRole('checkbox', { name: '도메인 이름 난독화' });
    this.비공개주석 = page.getByRole('textbox', { name: '비공개 주석' });
    this.공개주석 = page.getByRole('textbox', { name: '공개 주석', exact: true });
    this.차단추가 = page.getByRole('button', { name: '차단 추가' });
    this.도메인오류 = page.getByText('올바른 도메인 네임이 아닙니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(도메인차단폼화면.주소);
    await this.제목.waitFor();
    await this.차단추가.waitFor();
  }

  async 차단하기(도메인: string, 심각도?: '제한' | '정지' | '없음'): Promise<void> {
    await this.도메인칸.fill(도메인);
    if (심각도 !== undefined) await this.심각도.selectOption({ label: 심각도 });
    await this.차단추가.click();
    await this.page.waitForLoadState('load');
  }

  async 심각도기본값(): Promise<string> {
    return this.심각도.evaluate((요소) => (요소 as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '');
  }

  더강한제한안내(도메인: string): Locator {
    return this.page.getByText(`이미 ${도메인}에 대한 더 강력한 제한이 걸려 있습니다, 차단 해제를 먼저 해야 합니다`);
  }
}
