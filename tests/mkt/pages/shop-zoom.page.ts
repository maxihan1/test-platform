import type { Locator, Page } from '@playwright/test';

export class 이미지확대창 {
  constructor(private readonly page: Page) {}

  창(): Locator {
    return this.page.getByRole('dialog', { name: '이미지 확대 보기', exact: true });
  }

  위치글자(): Locator {
    return this.창().getByText(/^\d+ \/ \d+$/);
  }

  이전버튼(): Locator {
    return this.창().getByRole('button', { name: '이전 이미지', exact: true });
  }

  다음버튼(): Locator {
    return this.창().getByRole('button', { name: '다음 이미지', exact: true });
  }

  닫기버튼(): Locator {
    return this.창().getByRole('button', { name: '닫기', exact: true });
  }

  확대이미지(): Locator {
    return this.창().getByRole('img');
  }

  async 확대이미지주소(): Promise<string | null> {
    return this.확대이미지().getAttribute('src');
  }

  async 위치(): Promise<string | null> {
    return this.위치글자().textContent();
  }

  async 화면을덮는가(): Promise<boolean> {
    const 상자 = await this.창().boundingBox();
    const 화면 = this.page.viewportSize();
    return 상자 !== null && 화면 !== null && 상자.x <= 0 && 상자.y <= 0 && 상자.width >= 화면.width && 상자.height >= 화면.height;
  }

  async 위치글자가이미지위에있는가(): Promise<boolean> {
    const 글자상자 = await this.위치글자().boundingBox();
    const 이미지상자 = await this.확대이미지().boundingBox();
    return 글자상자 !== null && 이미지상자 !== null && 글자상자.y + 글자상자.height <= 이미지상자.y;
  }
}
