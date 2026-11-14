import type { Locator, Page } from '@playwright/test';

import { 대화창 } from '../components/dialog.component.js';
import { 로그인전화면 } from './landing.page.js';

export class 정보화면 {
  static readonly 주소 = '/about';

  readonly 틀: 로그인전화면;
  readonly 창: 대화창;
  readonly 서버이름: Locator;
  readonly 소개: Locator;
  readonly 알트배지: Locator;
  readonly 관리자제목: Locator;
  readonly 관리자영역: Locator;
  readonly 연락처제목: Locator;
  readonly 연락처영역: Locator;
  readonly 통계제목: Locator;
  readonly 활성사용자수: Locator;
  readonly 활성사용자: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 로그인전화면(page);
    this.창 = new 대화창(page);
    const 본문 = page.getByRole('main');
    this.서버이름 = 본문.getByRole('heading', { name: 'mastodon.maxihan.com', level: 1 });
    this.소개 = 본문.getByText('Mastodon으로 구동되는 분산 소셜 미디어');
    this.알트배지 = 본문.getByRole('button', { name: 'ALT', exact: true });
    this.관리자제목 = 본문.getByRole('heading', { name: '관리자:' });
    this.관리자영역 = this.관리자제목.locator('..');
    this.연락처제목 = 본문.getByRole('heading', { name: '연락처:' });
    this.연락처영역 = this.연락처제목.locator('..');
    this.통계제목 = page.getByRole('heading', { name: '서버 통계:' });
    const 통계영역 = this.통계제목.locator('..');
    this.활성사용자수 = 통계영역.getByText(/^\d+$/);
    this.활성사용자 = 통계영역.getByText('활성 사용자');
  }

  async 열기(): Promise<void> {
    await this.page.goto(정보화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.서버이름.waitFor();
    await this.틀.계정생성.waitFor();
  }

  구획(이름: string): Locator {
    return this.page.locator('.about__section').filter({ has: this.page.getByRole('button', { name: 이름, exact: true }) });
  }

  구획머리(이름: string): Locator {
    return this.구획(이름).getByRole('button', { name: 이름, exact: true });
  }

  구획본문(이름: string): Locator {
    return this.구획(이름).locator('.about__section__body');
  }

  구획안내(이름: string): Locator {
    return this.구획본문(이름).getByText('이 정보는 이 서버에서 사용할 수 없습니다.');
  }

  구획글(이름: string, 문구: string): Locator {
    return this.구획(이름).getByText(문구);
  }

  구획항목(이름: string): Locator {
    return this.구획(이름).getByRole('listitem');
  }

  async 펼치기(이름: string): Promise<void> {
    if (await this.구획본문(이름).isVisible()) return;
    await this.구획머리(이름).click();
    await this.구획본문(이름).waitFor();
  }

  async 머리누르기(이름: string): Promise<void> {
    await this.구획머리(이름).click();
  }

}
