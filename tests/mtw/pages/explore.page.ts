import type { Locator, Page } from '@playwright/test';

import { 펼침메뉴 } from '../components/dropdown.component.js';
import { 대화창 } from '../components/dialog.component.js';
import { 로그인안내창 } from '../components/interaction-modal.component.js';
import { 오른쪽메뉴 } from '../components/side-nav.component.js';
import { 알림막대 } from '../components/toast.component.js';

export class 유행중화면 {
  static readonly 주소 = '/explore';

  readonly 메뉴: 오른쪽메뉴;
  readonly 펼침: 펼침메뉴;
  readonly 창: 대화창;
  readonly 안내창: 로그인안내창;
  readonly 알림: 알림막대;
  readonly 영역: Locator;
  readonly 게시물탭: Locator;
  readonly 해시태그탭: Locator;
  readonly 소식탭: Locator;
  readonly 사람들탭: Locator;
  readonly 비었음: Locator;
  readonly 첫글: Locator;
  readonly 본문: Locator;
  readonly 작성자링크: Locator;
  readonly 시각링크: Locator;
  readonly 답장: Locator;
  readonly 부스트: Locator;
  readonly 좋아요: Locator;
  readonly 자세히: Locator;

  constructor(private readonly page: Page) {
    this.메뉴 = new 오른쪽메뉴(page);
    this.펼침 = new 펼침메뉴(page);
    this.창 = new 대화창(page);
    this.안내창 = new 로그인안내창(page);
    this.알림 = new 알림막대(page);
    this.영역 = page.getByRole('main').getByRole('region', { name: '유행 중' });
    this.게시물탭 = this.영역.getByRole('link', { name: '게시물', exact: true });
    this.해시태그탭 = this.영역.getByRole('link', { name: '해시태그', exact: true });
    this.소식탭 = this.영역.getByRole('link', { name: '소식', exact: true });
    this.사람들탭 = this.영역.getByRole('link', { name: '사람들', exact: true });
    this.비었음 = this.영역.getByText('아직 유행하는 것이 없습니다. 나중에 다시 확인하세요!');
    this.첫글 = this.영역.getByRole('article').first();
    this.본문 = this.첫글.getByRole('paragraph').first();
    this.작성자링크 = this.첫글.getByRole('link', { name: /@/ }).first();
    this.시각링크 = this.첫글.getByRole('link').filter({ has: page.getByRole('time') }).first();
    this.답장 = this.첫글.getByRole('button', { name: /답장/ });
    this.부스트 = this.첫글.getByRole('button', { name: /부스트/ });
    this.좋아요 = this.첫글.getByRole('button', { name: '좋아요' });
    this.자세히 = this.첫글.getByRole('button', { name: '자세히' });
  }

  영역글(문구: string | RegExp): Locator {
    return this.영역.getByText(문구).first();
  }

  async 열기(): Promise<void> {
    await this.page.goto(유행중화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.게시물탭.waitFor();
  }

  async 안내창닫기(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.안내창.창.waitFor({ state: 'detached' });
  }
}
