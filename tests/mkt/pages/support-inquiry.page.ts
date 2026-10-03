import type { Locator, Page } from '@playwright/test';

export class 문의 {
  constructor(private readonly page: Page) {}

  get 유형(): Locator {
    return this.page.getByRole('combobox', { name: '유형' });
  }

  get 유형항목(): Locator {
    return this.유형.getByRole('option').filter({ hasNotText: '유형을 선택하세요' });
  }

  get 제목칸(): Locator {
    return this.page.getByRole('textbox', { name: '제목' });
  }

  get 내용칸(): Locator {
    return this.page.getByRole('textbox', { name: '내용' });
  }

  get 내용글자수(): Locator {
    return this.page.getByText(/^\d+\/1000$/);
  }

  get 첨부파일(): Locator {
    return this.page.getByLabel('첨부 파일');
  }

  get 이메일알림(): Locator {
    return this.page.getByRole('checkbox', { name: '답변 알림 이메일 받기' });
  }

  get 등록(): Locator {
    return this.page.getByRole('button', { name: '등록', exact: true });
  }

  get 내역제목(): Locator {
    return this.page.getByRole('heading', { name: '내 문의 내역' });
  }

  get 내역첫줄(): Locator {
    return this.page.locator('#history tbody tr').first();
  }

  get 내역첫줄상태(): Locator {
    return this.내역첫줄.locator('.status');
  }

  get 내역줄들(): Locator {
    return this.page.locator('#history tbody tr');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/support/inquiry');
    await this.제목칸.waitFor();
  }

  async 채운다(유형: string, 제목: string, 내용: string): Promise<void> {
    await this.유형.selectOption({ label: 유형 });
    await this.제목칸.fill(제목);
    await this.내용칸.fill(내용);
  }
}
