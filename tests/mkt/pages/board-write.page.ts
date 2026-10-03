import type { Locator, Page } from '@playwright/test';

export class 게시글쓰기화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/board/write');
  }

  async 수정열기(번호: number | string): Promise<void> {
    await this.page.goto(`/board/${번호}/edit`);
  }

  제목표시(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  준비된폼(): Locator {
    return this.page.getByRole('main').locator('form:not([aria-busy])');
  }

  분류선택(): Locator {
    return this.page.getByLabel('분류', { exact: true });
  }

  분류선택지(이름: string): Locator {
    return this.분류선택().getByRole('option', { name: 이름, exact: true });
  }

  제목칸(): Locator {
    return this.page.getByLabel('제목', { exact: true });
  }

  본문칸(): Locator {
    return this.page.getByLabel('본문', { exact: true });
  }

  이미지입력(): Locator {
    return this.page.getByLabel(/^이미지 첨부/);
  }

  미리보기영역(): Locator {
    return this.page.getByLabel('첨부한 이미지', { exact: true });
  }

  미리보기(): Locator {
    return this.미리보기영역().getByRole('img');
  }

  미리보기순번(번호: number): Locator {
    return this.미리보기().nth(번호);
  }

  미리보기빼기버튼(): Locator {
    return this.미리보기영역().getByRole('button', { name: '이미지 빼기', exact: true });
  }

  등록버튼(): Locator {
    return this.page.getByRole('button', { name: '등록', exact: true });
  }

  임시저장버튼(): Locator {
    return this.page.getByRole('button', { name: '임시 저장', exact: true });
  }

  취소링크(): Locator {
    return this.page.getByRole('link', { name: '취소', exact: true });
  }

  권한없음문구(): Locator {
    return this.page.getByRole('heading', { name: '권한이 없습니다', exact: true });
  }

  권한없음홈링크(): Locator {
    return this.page.getByRole('link', { name: '홈으로', exact: true });
  }

  async 분류고르기(이름: string): Promise<void> {
    await this.분류선택().selectOption({ label: 이름 });
  }

  async 글채우기(분류: string, 제목: string, 본문: string): Promise<void> {
    await this.분류고르기(분류);
    await this.제목칸().fill(제목);
    await this.본문칸().fill(본문);
  }

  async 이미지올리기(파일: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.이미지입력().setInputFiles(파일);
  }
}
