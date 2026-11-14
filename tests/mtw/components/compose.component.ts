import type { Locator, Page } from '@playwright/test';

export interface 게시결과 {
  id: string;
  url: string;
}

export class 작성상자 {
  readonly 영역: Locator;
  readonly 공개범위: Locator;
  readonly 언어: Locator;
  readonly 본문: Locator;
  readonly 경고칸: Locator;
  readonly 첨부: Locator;
  readonly 파일칸: Locator;
  readonly 설문: Locator;
  readonly 경고: Locator;
  readonly 에모지: Locator;
  readonly 게시: Locator;

  constructor(private readonly page: Page) {
    this.영역 = page.getByRole('region', { name: '새 게시물' });
    this.공개범위 = this.영역.getByRole('button', { name: /^(공개|조용한 공개|팔로워|개인 멘션)/ });
    this.언어 = this.영역.getByRole('button', { name: '한국어' });
    this.본문 = this.영역.getByRole('textbox', { name: '지금 무슨 생각을 하고 있나요?' });
    this.경고칸 = this.영역.getByRole('textbox', { name: /내용 경고/ });
    this.첨부 = this.영역.getByRole('button', { name: '이미지, 영상, 오디오 파일 추가' });
    this.파일칸 = this.영역.locator('input[type="file"]');
    this.설문 = this.영역.getByRole('button', { name: /설문 (추가|제거)/ });
    this.경고 = this.영역.getByRole('button', { name: /열람 ?주의/ });
    this.에모지 = this.영역.getByRole('button', { name: '에모지 추가' });
    this.게시 = this.영역.getByRole('button', { name: /^(게시|답장|수정)$/ });
  }

  남은글자(수: number | string): Locator {
    return this.영역.getByText(String(수), { exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.본문.waitFor();
  }

  async 쓰기(글: string): Promise<void> {
    await this.본문.fill(글);
  }

  async 게시하기(): Promise<게시결과> {
    const 응답 = this.page.waitForResponse((r) => r.url().endsWith('/api/v1/statuses') && r.request().method() === 'POST');
    await this.게시.click();
    const 몸 = (await (await 응답).json()) as 게시결과;
    return { id: 몸.id, url: 몸.url };
  }
}
