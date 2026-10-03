import type { Locator, Page } from '@playwright/test';

export class 글쓰기 {
  constructor(private readonly page: Page) {}

  get 준비된폼(): Locator {
    return this.page.locator('#post-form:not([aria-busy])');
  }

  get 제목머리(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get 분류(): Locator {
    return this.page.getByRole('combobox', { name: '분류' });
  }

  get 분류선택(): Locator {
    return this.분류.locator('option:checked');
  }

  get 분류항목(): Locator {
    return this.분류.getByRole('option').filter({ hasNotText: '분류를 선택하세요' });
  }

  get 제목칸(): Locator {
    return this.page.getByRole('textbox', { name: '제목' });
  }

  get 제목글자수(): Locator {
    return this.page.getByText(/^\d+\/50$/);
  }

  get 본문칸(): Locator {
    return this.page.getByRole('textbox', { name: '본문' });
  }

  get 본문글자수(): Locator {
    return this.page.getByText(/^\d+\/2000$/);
  }

  get 이미지입력(): Locator {
    return this.page.getByLabel('이미지 첨부');
  }

  get 미리보기(): Locator {
    return this.page.getByRole('img', { name: /^첨부 이미지/ });
  }

  get 이미지빼기(): Locator {
    return this.page.getByRole('button', { name: '이미지 빼기' });
  }

  get 임시저장(): Locator {
    return this.page.getByRole('button', { name: '임시 저장', exact: true });
  }

  get 등록(): Locator {
    return this.page.getByRole('button', { name: '등록', exact: true });
  }

  async 열기(경로 = '/board/write'): Promise<void> {
    await this.page.goto(경로);
    await this.제목칸.waitFor();
    await this.준비된폼.waitFor();
  }

  async 채운다(분류: string, 제목: string, 본문: string): Promise<void> {
    await this.분류.selectOption({ label: 분류 });
    await this.제목칸.fill(제목);
    await this.본문칸.fill(본문);
  }
}
