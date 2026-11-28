import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';

import { 글카드 } from '../components/status-card.component.js';
import { 꾸러미, 모든글자, 모든요소, 목록안글자, 앱id } from '../helpers/app.helper.js';

export type 프로필탭 = '타임라인' | '미디어' | '추천';

export class 프로필글목록 {
  static readonly 주소 = 'app:.MainActivity/타임라인';
  static readonly 탭줄 = `android=new UiSelector().resourceId("${꾸러미}:id/tabbar").className("android.widget.HorizontalScrollView")`;
  static readonly 필터제목 = 목록안글자('Posts and boosts', 'list');
  static readonly 필터버튼 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/filter_button"))`;
  static readonly 고정배지 = 목록안글자('Pinned', 'list');
  static readonly 모든고정글 = 목록안글자('View all pinned posts', 'list');

  static 탭(이름: 프로필탭): string {
    return `~${이름}`;
  }

  readonly 카드: 글카드;

  constructor(private readonly driver: AppDriver) {
    this.카드 = new 글카드(driver);
  }

  async 탭있나(이름: 프로필탭, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필글목록.탭(이름), 시간);
  }

  async 탭줄있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필글목록.탭줄, 시간);
  }

  async 탭누르기(이름: 프로필탭): Promise<void> {
    if (!(await this.탭있나(이름, 10_000))) throw new Error(`프로필 「${이름}」 탭이 안 보인다`);
    await this.driver.$(프로필글목록.탭(이름)).click();
  }

  async 탭선택됐나(이름: 프로필탭): Promise<boolean> {
    return (await this.driver.$(프로필글목록.탭(이름)).getAttribute('selected')) === 'true';
  }

  async 필터있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필글목록.필터제목, 시간);
  }

  async 필터누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필글목록.필터버튼, 10_000))) throw new Error('프로필 필터 버튼이 안 보인다');
    await this.driver.$(프로필글목록.필터버튼).click();
  }

  async 고정배지있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필글목록.고정배지, 시간);
  }

  async 고정배지수(): Promise<number> {
    return (await 모든요소(this.driver, 프로필글목록.고정배지)).length;
  }

  async 모든고정글보이나(): Promise<boolean> {
    return 보이나(this.driver, 프로필글목록.모든고정글);
  }

  async 모든고정글누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필글목록.모든고정글, 10_000))) throw new Error('「View all pinned posts」가 안 보인다');
    await this.driver.$(프로필글목록.모든고정글).click();
  }

  async 글보이나(글자: string): Promise<boolean> {
    return this.카드.보이나(글자);
  }

  async 글찾을때까지내리기(글자: string): Promise<boolean> {
    return this.카드.찾을때까지내리기(글자, 15, 앱id('scroller'));
  }

  static 칩(태그: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/hashtags").childSelector(new UiSelector().text(${JSON.stringify(`#${태그}`)}))`;
  }

  async 칩있나(태그: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필글목록.칩(태그), 시간);
  }

  async 칩누르기(태그: string): Promise<void> {
    if (!(await this.칩있나(태그, 10_000))) throw new Error(`프로필 해시태그 칩 「#${태그}」이 안 보인다`);
    await this.driver.$(프로필글목록.칩(태그)).click();
  }

  async 보이는글본문들(): Promise<string[]> {
    return 모든글자(this.driver, 앱id('text'));
  }
}
