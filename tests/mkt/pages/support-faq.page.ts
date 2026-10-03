import type { FrameLocator, Locator, Page } from '@playwright/test';

export class 고객센터 {
  constructor(private readonly page: Page) {}

  get 자주묻는질문(): Locator {
    return this.page.getByRole('heading', { name: '자주 묻는 질문' });
  }

  get 분류탭묶음(): Locator {
    return this.page.getByRole('tablist', { name: 'FAQ 분류' });
  }

  분류탭(이름: string): Locator {
    return this.분류탭묶음.getByRole('tab', { name: 이름, exact: true });
  }

  get 분류탭들(): Locator {
    return this.분류탭묶음.getByRole('tab');
  }

  get 패널(): Locator {
    return this.page.getByRole('tabpanel');
  }

  get 질문들(): Locator {
    return this.패널.getByRole('button');
  }

  질문(글자: string): Locator {
    return this.패널.getByRole('button', { name: 글자, exact: true });
  }

  get 펼친답들(): Locator {
    return this.패널.getByRole('region');
  }

  get 검색칸(): Locator {
    return this.page.getByRole('searchbox', { name: 'FAQ 검색' });
  }

  get 빈안내(): Locator {
    return this.page.getByText('검색 결과가 없습니다');
  }

  get 오시는길(): Locator {
    return this.page.getByRole('heading', { name: '오시는 길' });
  }

  get 지도틀(): Locator {
    return this.page.getByTitle('오시는 길 지도');
  }

  get 지도안(): FrameLocator {
    return this.page.locator('iframe').contentFrame();
  }

  get 확대(): Locator {
    return this.지도안.getByRole('button', { name: '확대' });
  }

  get 축소(): Locator {
    return this.지도안.getByRole('button', { name: '축소' });
  }

  get 배율(): Locator {
    return this.지도안.getByRole('status');
  }

  get 상담자동답변(): Locator {
    return this.page.getByText('상담원 연결 중입니다. 잠시만 기다려 주세요.');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/support');
    await this.질문들.first().waitFor();
  }
}
