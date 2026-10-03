import type { Locator, Page } from '@playwright/test';

export class 고객센터화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/support');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '고객센터', level: 1, exact: true });
  }

  FAQ제목(): Locator {
    return this.page.getByRole('heading', { name: '자주 묻는 질문', level: 2, exact: true });
  }

  분류탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  선택된분류탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  질문목록(): Locator {
    return this.page.getByRole('tabpanel');
  }

  질문버튼들(): Locator {
    return this.질문목록().getByRole('button');
  }

  질문버튼(질문: string): Locator {
    return this.질문목록().getByRole('button', { name: 질문, exact: true });
  }

  펼쳐진질문버튼(질문: string): Locator {
    return this.질문목록().getByRole('button', { name: 질문, exact: true, expanded: true });
  }

  펼쳐진답들(): Locator {
    return this.질문목록().getByRole('region');
  }

  검색칸(): Locator {
    return this.page.getByLabel('FAQ 검색', { exact: true });
  }

  결과없음문구(): Locator {
    return this.page.getByText('검색 결과가 없습니다', { exact: true });
  }

  문의하기링크(): Locator {
    return this.page.getByRole('link', { name: '1:1 문의', exact: true });
  }

  async 질문누르기(질문: string): Promise<void> {
    await this.질문버튼(질문).click();
  }

  async 검색하기(글자: string): Promise<void> {
    await this.검색칸().fill(글자);
  }

  상담버튼(): Locator {
    return this.page.getByRole('button', { name: '상담하기', exact: true });
  }

  상담창(): Locator {
    return this.page.getByRole('region', { name: '상담 창', exact: true });
  }

  상담메시지칸(): Locator {
    return this.상담창().getByLabel('상담 메시지', { exact: true });
  }

  상담보내기버튼(): Locator {
    return this.상담창().getByRole('button', { name: '보내기', exact: true });
  }

  상담말풍선(글자: string): Locator {
    return this.상담창().getByText(글자, { exact: true });
  }

  async 상담메시지보내기(글자: string): Promise<void> {
    await this.상담메시지칸().fill(글자);
    await this.상담보내기버튼().click();
  }
}
