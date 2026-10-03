import type { Locator, Page } from '@playwright/test';

export class 공통보충화면 {
  constructor(private readonly page: Page) {}

  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
  }

  없는주소제목(): Locator {
    return this.page.getByRole('heading', { name: '페이지를 찾을 수 없습니다', level: 1, exact: true });
  }

  홈으로버튼(): Locator {
    return this.page.getByRole('link', { name: '홈으로', exact: true });
  }

  바닥글(): Locator {
    return this.page.getByRole('contentinfo');
  }

  이용약관링크(): Locator {
    return this.바닥글().getByRole('link', { name: '이용약관', exact: true });
  }

  개인정보처리방침링크(): Locator {
    return this.바닥글().getByRole('link', { name: '개인정보처리방침', exact: true });
  }

  저작권문구(): Locator {
    return this.바닥글().getByText('© 2026 DemoMarket', { exact: true });
  }

  쿠키안내문구(): Locator {
    return this.page.getByRole('region', { name: '쿠키 안내', exact: true }).getByText('서비스 개선을 위해 쿠키를 사용합니다.', { exact: true });
  }

  async 쿠키띠아래끝과화면아래끝의차(): Promise<number> {
    const 상자 = await this.page.getByRole('region', { name: '쿠키 안내', exact: true }).boundingBox();
    const 화면 = this.page.viewportSize();
    if (상자 === null || 화면 === null) throw new Error('위치를 잴 수 없다: 쿠키 띠가 화면에 없거나 화면 크기를 모른다');
    return Math.abs(상자.y + 상자.height - 화면.height);
  }

  async 쿠키띠위치방식(): Promise<string> {
    return this.page.getByRole('region', { name: '쿠키 안내', exact: true }).evaluate((띠) => getComputedStyle(띠).position);
  }

  상담버튼(): Locator {
    return this.page.getByRole('button', { name: '상담하기', exact: true });
  }

  회원가입제목(): Locator {
    return this.page.getByRole('heading', { name: '회원가입', level: 1, exact: true });
  }

  보이는입력칸들(): Locator {
    return this.page.locator('input, select, textarea').filter({ visible: true });
  }

  async 보이는입력칸수(): Promise<number> {
    return this.보이는입력칸들().count();
  }

  async 이름표없는입력칸수(): Promise<number> {
    return this.보이는입력칸들().evaluateAll((칸들) => 칸들.filter((칸) => !(칸 instanceof HTMLInputElement || 칸 instanceof HTMLSelectElement || 칸 instanceof HTMLTextAreaElement) || (칸.labels?.length ?? 0) === 0).length);
  }

  화면본문(): Locator {
    return this.page.locator('body');
  }

  async 화면글자(): Promise<string> {
    return this.화면본문().innerText();
  }

  권한없음제목(): Locator {
    return this.page.getByRole('heading', { name: '권한이 없습니다', level: 1, exact: true });
  }

  async 주소경로(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
