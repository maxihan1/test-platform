import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 연합화면 {
  static readonly 주소 = '/admin/instances';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 도메인차단추가하기: Locator;
  readonly 내보내기: Locator;
  readonly 불러오기: Locator;
  readonly 도메인허용: Locator;
  readonly 모두: Locator;
  readonly 제한: Locator;
  readonly 전체: Locator;
  readonly 실패중: Locator;
  readonly 사용불가: Locator;
  readonly 도메인칸: Locator;
  readonly 검색: Locator;
  readonly 초기화: Locator;
  readonly 비어있음: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '연합', level: 1, exact: true });
    this.알림 = new 알림(page);
    this.도메인차단추가하기 = page.getByRole('link', { name: '도메인 차단 추가하기' });
    this.내보내기 = page.getByRole('link', { name: '내보내기', exact: true });
    this.불러오기 = page.getByRole('link', { name: '불러오기', exact: true });
    this.도메인허용 = page.getByRole('link', { name: '도메인 허용' }).or(page.getByRole('button', { name: '도메인 허용' })).first();
    this.모두 = page.getByRole('link', { name: '모두', exact: true });
    this.제한 = page.getByRole('link', { name: '제한', exact: true });
    this.전체 = page.getByRole('link', { name: '전체', exact: true });
    this.실패중 = page.getByRole('link', { name: '실패중', exact: true });
    this.사용불가 = page.getByRole('link', { name: '사용불가', exact: true });
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.검색 = page.getByRole('button', { name: '검색' });
    this.초기화 = page.getByRole('link', { name: '초기화' });
    this.비어있음 = page.getByText('도메인이 하나도 없습니다.');
  }

  async 열기(조건 = 'limited=1'): Promise<number> {
    const 응답 = await this.page.goto(`${연합화면.주소}${조건 ? `?${조건}` : ''}`);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }

  줄(도메인: string): Locator {
    return this.page.getByRole('link', { name: 도메인 });
  }

  async 줄도메인글(도메인: string): Promise<string> {
    const 글 = await this.줄(도메인).innerText();
    return (글.split('\n')[0] ?? '').trim();
  }

  줄정책(도메인: string, 정책: string): Locator {
    return this.줄(도메인).getByText(정책, { exact: true });
  }

  async 검색하기(도메인: string): Promise<void> {
    await this.도메인칸.fill(도메인);
    await this.검색.click();
    await this.page.waitForURL(/by_domain=/);
    await this.page.waitForLoadState('load');
    await this.줄(도메인).or(this.비어있음).first().waitFor();
  }

  async 내보내기받기(): Promise<string> {
    const 받기 = this.page.waitForEvent('download');
    await this.내보내기.click();
    const 파일 = await 받기;
    let 글 = '';
    for await (const 조각 of await 파일.createReadStream()) 글 += String(조각);
    return 글;
  }
}
