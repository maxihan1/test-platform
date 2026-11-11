import type { Locator, Page } from '@playwright/test';

export class 서버상세화면 {
  static readonly 주소 = '/admin/instances/';

  readonly 콘텐츠정책: Locator;
  readonly 도메인차단수정: Locator;
  readonly 도메인차단취소: Locator;
  readonly 최근감사기록: Locator;
  readonly 중재참고사항: Locator;
  readonly 가용성: Locator;
  readonly 정책칸: Locator;
  readonly 내부참고사항칸: Locator;

  constructor(private readonly page: Page) {
    this.콘텐츠정책 = page.getByRole('heading', { name: '콘텐츠 정책', level: 3 });
    this.도메인차단수정 = page.getByRole('link', { name: '도메인 차단 수정' });
    this.도메인차단취소 = page.getByRole('link', { name: '도메인 차단 취소' });
    this.최근감사기록 = page.getByRole('heading', { name: '최근 감사 기록', level: 3 });
    this.중재참고사항 = page.getByRole('heading', { name: '중재 참고사항', level: 3 });
    this.가용성 = page.getByRole('heading', { name: '가용성', level: 3 });
    this.정책칸 = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '정책' }) }).getByRole('cell');
    this.내부참고사항칸 = page.getByRole('row').filter({ has: page.getByText('내부 참고사항', { exact: true }) }).getByRole('cell');
  }

  제목(도메인: string): Locator {
    return this.page.getByRole('heading', { name: 도메인, level: 1, exact: true });
  }

  async 열기(도메인: string): Promise<number> {
    const 응답 = await this.page.goto(`${서버상세화면.주소}${도메인}`);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }
}
