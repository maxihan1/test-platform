import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 개인정보와도달화면 {
  static readonly 주소 = '/settings/privacy';

  readonly 틀: 설정틀;
  readonly 발견추천: Locator;
  readonly 자동수락: Locator;
  readonly 검색포함: Locator;
  readonly 검색엔진: Locator;
  readonly 앱표시: Locator;
  readonly 새프로필편집안내: Locator;
  readonly 새프로필편집이동: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.발견추천 = page.getByRole('checkbox', { name: /나를 발견하기 기능에서 추천/ });
    this.자동수락 = page.getByRole('checkbox', { name: /새 팔로워를 자동으로 수락하기/ });
    this.검색포함 = page.getByRole('checkbox', { name: /공개 게시물을 검색 결과에 포함시키기/ });
    this.검색엔진 = page.getByRole('checkbox', { name: /검색엔진에 프로필 페이지 포함하기/ });
    this.앱표시 = page.getByRole('checkbox', { name: /어떤 앱으로 게시물을 보냈는지 표시/ });
    this.새프로필편집안내 = page.getByText('새로운 프로필 편집 경험이 기다립니다');
    this.새프로필편집이동 = page.getByRole('link', { name: '이동', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인정보와도달화면.주소);
    await this.틀.저장.waitFor();
  }

  async 비회원으로열기(): Promise<void> {
    await this.page.goto(개인정보와도달화면.주소);
  }

  async 켜고끄기(칸: Locator, 켬: boolean): Promise<void> {
    await 칸.setChecked(켬);
  }

  async 저장하기(): Promise<void> {
    await this.틀.저장.click();
  }
}
