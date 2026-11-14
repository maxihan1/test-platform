import type { Locator, Page } from '@playwright/test';

import { 펼침메뉴 } from '../components/dropdown.component.js';
import { 작성상자 } from '../components/compose.component.js';
import { 오른쪽메뉴 } from '../components/side-nav.component.js';
import { 알림막대 } from '../components/toast.component.js';

export class 홈화면 {
  static readonly 주소 = '/home';

  readonly 메뉴: 오른쪽메뉴;
  readonly 작성: 작성상자;
  readonly 알림: 알림막대;
  readonly 펼침: 펼침메뉴;
  readonly 제목: Locator;
  readonly 피드: Locator;
  readonly 설정버튼: Locator;
  readonly 비활성배너: Locator;
  readonly 검색칸: Locator;
  readonly 프로필카드: Locator;
  readonly 새게시물버튼: Locator;
  readonly 하단탭: Locator;
  readonly 공지배너: Locator;
  readonly 공지토글: Locator;
  readonly 공지내용: Locator;
  readonly 불러오는중: Locator;
  readonly 빈안내: Locator;
  readonly 준비중제목: Locator;
  readonly 준비중안내: Locator;
  readonly 새항목버튼: Locator;
  readonly 왼쪽열: Locator;
  readonly 가운데열: Locator;
  readonly 첫글: Locator;

  constructor(private readonly page: Page) {
    this.메뉴 = new 오른쪽메뉴(page);
    this.작성 = new 작성상자(page);
    this.알림 = new 알림막대(page);
    this.펼침 = new 펼침메뉴(page);
    this.제목 = page.getByRole('main').getByRole('heading', { name: '홈', level: 1 });
    this.피드 = page.getByRole('region', { name: '홈' }).getByRole('feed');
    this.설정버튼 = page.getByRole('main').getByRole('button', { name: '설정 보이기' });
    this.비활성배너 = page.getByText(/현재 비활성화 상태입니다/);
    this.검색칸 = page.getByPlaceholder('검색하거나 URL 붙여넣기');
    this.프로필카드 = this.작성.영역.getByRole('link', { name: /@/ }).first();
    this.하단탭 = page.getByRole('button', { name: '메뉴', exact: true }).locator('..');
    this.새게시물버튼 = this.하단탭.getByRole('link', { name: '새 게시물', exact: true });
    this.공지배너 = page.getByRole('main').getByRole('button', { name: /^공지사항 (보기|숨기기)$/ });
    this.공지내용 = page.getByRole('main').getByRole('button', { name: '공지사항 보기', exact: true });
    this.공지토글 = this.공지배너;
    this.불러오는중 = page.getByRole('progressbar', { name: '불러오는 중…' });
    this.빈안내 = page.getByText('당신의 홈 타임라인은 비어있습니다! 더 많은 사람을 팔로우하여 채워보세요.');
    this.준비중제목 = page.getByText('홈 피드를 준비 중입니다…');
    this.준비중안내 = page.getByText('잠시 기다려주세요.');
    this.새항목버튼 = page.getByRole('button', { name: '1 개의 새 항목' });
    this.왼쪽열 = this.작성.영역;
    this.가운데열 = page.getByRole('main');
    this.첫글 = this.피드.getByRole('article').first();
  }

  카드표시이름(표시이름: string): Locator {
    return this.프로필카드.getByText(표시이름, { exact: true });
  }

  카드핸들(핸들: string): Locator {
    return this.프로필카드.getByText(`@${핸들}`);
  }

  설정항목(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름 });
  }

  하단탭항목(이름: string): Locator {
    return this.하단탭.getByRole('link', { name: 이름, exact: true }).or(this.하단탭.getByRole('button', { name: 이름, exact: true }));
  }

  async 아래로내리기(): Promise<void> {
    await this.피드.hover();
    await this.page.mouse.wheel(0, 2000);
  }

  async 작성자글찾기(아이디: string, 최대쪽 = 8): Promise<boolean> {
    const 작성자 = this.피드.getByRole('link', { name: new RegExp(`@${아이디}$`) }).first();
    const 더불러오기 = this.page.getByRole('main').getByRole('button', { name: /^(더보기|더 보기)$/ });
    for (let 쪽 = 0; 쪽 < 최대쪽; 쪽 += 1) {
      if (await 작성자.waitFor({ timeout: 3_000 }).then(() => true, () => false)) return true;
      if ((await 더불러오기.count()) === 0) return false;
      const 앞수 = await this.피드.getByRole('article').count();
      await 더불러오기.last().scrollIntoViewIfNeeded();
      await 더불러오기.last().click();
      await this.피드.getByRole('article').nth(앞수).waitFor({ timeout: 10_000 }).catch(() => undefined);
    }
    return 작성자.isVisible();
  }

  async 좁은화면열기(): Promise<void> {
    await this.page.setViewportSize({ width: 390, height: 844 });
    await this.page.goto(홈화면.주소);
    await this.가운데열.waitFor();
  }

  async 열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
    await this.그려질때까지();
  }

  async 주소만열기(): Promise<void> {
    await this.page.goto(홈화면.주소);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.메뉴.그려질때까지();
    await this.작성.그려질때까지();
  }

  글(글조각: string): Locator {
    return this.피드.getByRole('article').filter({ hasText: 글조각 });
  }
}
