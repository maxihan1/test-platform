import type { Locator, Page } from '@playwright/test';

export class 문의화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/support/inquiry');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '1:1 문의', level: 1, exact: true });
  }

  유형선택(): Locator {
    return this.page.getByLabel('유형', { exact: true });
  }

  제목칸(): Locator {
    return this.page.getByLabel('제목', { exact: true });
  }

  내용칸(): Locator {
    return this.page.getByLabel('내용', { exact: true });
  }

  내용글자수(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  첨부칸(): Locator {
    return this.page.getByLabel('첨부 파일 (1개, 10MB 이하)', { exact: true });
  }

  답변알림체크(): Locator {
    return this.page.getByRole('checkbox', { name: '답변 알림 이메일 받기', exact: true });
  }

  등록버튼(): Locator {
    return this.page.getByRole('button', { name: '등록', exact: true });
  }

  내역제목(): Locator {
    return this.page.getByRole('heading', { name: '내 문의 내역', level: 2, exact: true });
  }

  내역줄(제목: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: 제목, exact: true }) });
  }

  내역줄들(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  async 고를수있는유형들(): Promise<string[]> {
    return this.유형선택().evaluate((선택) =>
      Array.from((선택 as HTMLSelectElement).options)
        .filter((선택지) => 선택지.value !== '')
        .map((선택지) => 선택지.text),
    );
  }

  async 내역줄글자들(): Promise<string[][]> {
    return this.내역줄들().evaluateAll((줄들) =>
      줄들.map((줄) => Array.from(줄.querySelectorAll('td'), (칸) => (칸 as HTMLElement).innerText.trim())),
    );
  }

  async 문의등록하기(유형: string, 제목: string, 내용: string): Promise<void> {
    await this.유형선택().selectOption({ label: 유형 });
    await this.제목칸().fill(제목);
    await this.내용칸().fill(내용);
    await this.등록버튼().click();
  }
}
