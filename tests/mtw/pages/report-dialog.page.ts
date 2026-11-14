import type { Locator, Page } from '@playwright/test';

export class 신고창 {
  static readonly 주소 = '/@{아이디}';

  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 다음: Locator;
  readonly 닫기: Locator;
  readonly 추가정보칸: Locator;
  readonly 신고하기: Locator;
  readonly 실패안내: Locator;

  constructor(page: Page) {
    this.창 = page.getByRole('dialog');
    this.제목 = this.창.getByRole('heading', { level: 1 });
    this.다음 = this.창.getByRole('button', { name: '다음' });
    this.닫기 = this.창.getByRole('button', { name: '닫기' });
    this.추가정보칸 = this.창.getByRole('textbox', { name: '우리가 더 알아야 할 내용이 있나요?' });
    this.신고하기 = this.창.getByRole('button', { name: '신고하기' });
    this.실패안내 = page.getByText('신고를 제출할 수 없습니다');
  }

  async 뜰때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  분류(이름: string): Locator {
    return this.창.getByRole('radio', { name: 이름 });
  }

  async 분류고르고다음(이름: string): Promise<void> {
    await this.분류(이름).check();
    await this.다음.click();
  }

  async 기타로추가정보까지가기(): Promise<void> {
    await this.뜰때까지();
    await this.분류고르고다음('기타');
    await this.다음.click();
    await this.추가정보칸.waitFor();
  }

  async 닫기누르기(): Promise<void> {
    await this.닫기.click();
    await this.창.first().waitFor({ state: 'detached' });
  }
}
