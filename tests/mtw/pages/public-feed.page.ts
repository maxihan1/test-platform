import type { Locator, Page } from '@playwright/test';

import { 작성상자 } from '../components/compose.component.js';
import { 로그인안내창 } from '../components/interaction-modal.component.js';
import { 오른쪽메뉴 } from '../components/side-nav.component.js';
import { 알림막대 } from '../components/toast.component.js';

export class 실시간피드화면 {
  static readonly 주소 = '/public/local';

  readonly 메뉴: 오른쪽메뉴;
  readonly 안내창: 로그인안내창;
  readonly 알림: 알림막대;
  readonly 작성: 작성상자;
  readonly 영역: Locator;
  readonly 이서버탭: Locator;
  readonly 다른서버탭: Locator;
  readonly 모두탭: Locator;
  readonly 지우기: Locator;
  readonly 설정버튼: Locator;
  readonly 글목록: Locator;
  readonly 첫글: Locator;
  readonly 첫글작성자: Locator;
  readonly 답장: Locator;
  readonly 부스트: Locator;
  readonly 좋아요: Locator;
  readonly 북마크: Locator;
  readonly 새항목버튼: Locator;
  readonly 이서버빈안내: Locator;
  readonly 다른서버빈안내: Locator;
  readonly 비활성안내: Locator;
  readonly 더보기: Locator;
  readonly 가입등록: Locator;
  readonly 가입안내창: Locator;

  constructor(private readonly page: Page) {
    this.메뉴 = new 오른쪽메뉴(page);
    this.안내창 = new 로그인안내창(page);
    this.알림 = new 알림막대(page);
    this.작성 = new 작성상자(page);
    this.영역 = page.getByRole('main').getByRole('region', { name: '실시간 피드' });
    this.이서버탭 = this.영역.getByRole('link', { name: '이 서버', exact: true });
    this.다른서버탭 = this.영역.getByRole('link', { name: '다른 서버', exact: true });
    this.모두탭 = this.영역.getByRole('link', { name: '모두', exact: true });
    this.지우기 = this.영역.getByRole('button', { name: '지우기', exact: true });
    this.설정버튼 = page.getByRole('main').getByRole('button', { name: '설정 보이기' });
    this.글목록 = this.영역.getByRole('feed').getByRole('article');
    this.첫글 = this.글목록.first();
    this.첫글작성자 = this.첫글.getByRole('strong').first();
    this.답장 = this.첫글.getByRole('button', { name: /답장/ });
    this.부스트 = this.첫글.getByRole('button', { name: /부스트/ });
    this.좋아요 = this.첫글.getByRole('button', { name: '좋아요' });
    this.북마크 = this.첫글.getByRole('button', { name: '북마크' });
    this.새항목버튼 = this.영역.getByRole('button', { name: '1 개의 새 항목' });
    this.이서버빈안내 = page.getByText('로컬 타임라인에 아무것도 없습니다. 아무거나 적어 보세요!');
    this.다른서버빈안내 = page.getByText('여기엔 아직 아무 것도 없습니다! 공개적으로 무언가 포스팅하거나, 다른 서버의 사용자를 팔로우 해서 채워보세요');
    this.더보기 = this.영역.getByRole('button', { name: '더보기' });
    this.가입등록 = page.getByRole('button', { name: '등록하기' });
    this.가입안내창 = page.getByRole('dialog').filter({ hasText: '마스토돈에서 가입' });
    this.비활성안내 = page.getByText('이 피드는 서버 관리자에 의해 비활성화되었습니다.');
  }

  설정항목(이름: string): Locator {
    return this.page.getByRole('main').getByRole('checkbox', { name: 이름 });
  }

  머리말(문구: string): Locator {
    return this.영역.getByText(문구);
  }

  글(글조각: string): Locator {
    return this.글목록.filter({ hasText: 글조각 });
  }

  async 열기(): Promise<void> {
    await this.page.goto(실시간피드화면.주소);
    await this.그려질때까지();
  }

  async 다른서버열기(): Promise<void> {
    await this.page.goto('/public/remote');
    await this.그려질때까지();
  }

  async 모두열기(): Promise<void> {
    await this.page.goto('/public');
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.영역.waitFor();
    await this.첫글.or(this.이서버빈안내).or(this.다른서버빈안내).or(this.비활성안내).or(this.더보기).first().waitFor();
  }

  async 안내창닫기(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.안내창.창.waitFor({ state: 'detached' });
  }
}
