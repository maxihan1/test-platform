import type { Locator, Page } from '@playwright/test';

export class 공지상세화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 미리보기버튼: Locator;
  readonly 다운로드버튼: Locator;
  readonly 목록버튼: Locator;
  readonly 없는공지문구: Locator;

  constructor(page: Page) {
    this.page = page;
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '공지사항', exact: true, level: 2 });
    this.미리보기버튼 = 본문.getByRole('button', { name: '미리보기' });
    this.다운로드버튼 = 본문.getByRole('button', { name: '다운로드' });
    this.목록버튼 = 본문.getByRole('button', { name: '목록', exact: true });
    this.없는공지문구 = 본문.getByText('공지사항 정보가 없습니다.');
  }

  async 연다(번호: string): Promise<void> {
    await this.page.goto(`/board/noticeDetail?pstartSn=${번호}`);
  }
}
