import type { AppDriver } from '@platform/kit/app';
import { 길게누르기, 두번누르기, 뜰때까지, 사라질때까지, 될때까지, 칸비우기, 칸에적기, 보이나, 포커스칸에치기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 꾸러미, 앱id } from '../helpers/app.helper.js';
import { 토스트에글자있나, 토스트읽기 } from '../helpers/system-ui.helper.js';

export type 글쓰기도구 = '미디어' | '투표' | '에모지' | '열람 주의' | '언어';

const 도구설명: Record<글쓰기도구, string> = { 미디어: '미디어 추가', 투표: '투표 추가', 에모지: '에모지', '열람 주의': '열람 주의', 언어: '언어' };

function 안쪽(부모: string, 자식: string): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${부모}").childSelector(${자식})`;
}

export class 글쓰기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 게시버튼 = 앱id('publish');
  static readonly 본문칸 = 앱id('toot_text');
  static readonly 새게시물제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().text("새 게시물"))';
  static readonly 수정제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().text("게시물 편집"))';
  static readonly 닫기버튼 = '~뒤로 가기';
  static readonly 글자수 = 앱id('char_counter');
  static readonly 공개범위버튼 = 앱id('btn_visibility');
  static readonly 공개범위글 = 안쪽('btn_visibility', 'new UiSelector().className("android.widget.TextView")');
  static readonly 글쓴이이름 = 안쪽('inner_scroller', `new UiSelector().resourceId("${꾸러미}:id/name").instance(0)`);
  static readonly 글쓴이계정 = 안쪽('inner_scroller', `new UiSelector().resourceId("${꾸러미}:id/username")`);
  static readonly 글쓴이아바타 = 안쪽('inner_scroller', `new UiSelector().resourceId("${꾸러미}:id/avatar").instance(0)`);
  static readonly 답장머리 = 앱id('header');
  static readonly 답장원문 = 안쪽('reply_wrap', `new UiSelector().resourceId("${꾸러미}:id/text")`);
  static readonly 답장이름 = 안쪽('reply_wrap', `new UiSelector().resourceId("${꾸러미}:id/name")`);
  static readonly 열람주의칸 = 앱id('content_warning');
  static readonly 자동완성구분선 = 앱id('bottom_bar_autocomplete_divider');
  static readonly 인용카드 = 앱id('quoted_post_wrap');
  static readonly 인용카드글 = 안쪽('quoted_post_wrap', `new UiSelector().resourceId("${꾸러미}:id/text")`);
  static readonly 인용카드이름 = 안쪽('quoted_post_wrap', `new UiSelector().resourceId("${꾸러미}:id/name")`);
  static readonly 인용취소 = '~인용 취소';

  static 도구(이름: 글쓰기도구): string {
    return `~${도구설명[이름]}`;
  }

  static 자동완성글(글자: string): string {
    return 안쪽('bottom_bar', `new UiSelector().textContains(${JSON.stringify(글자)})`);
  }

  static 창글자(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 새게시물떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.새게시물제목, 시간);
  }

  async 수정화면떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.수정제목, 시간);
  }

  async 닫혔나(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 글쓰기화면.본문칸, 시간);
  }

  async 제목글(): Promise<string> {
    const 제목 = (await 보이나(this.driver, 글쓰기화면.수정제목)) ? 글쓰기화면.수정제목 : 글쓰기화면.새게시물제목;
    return this.driver.$(제목).getText();
  }

  async 닫기있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.닫기버튼, 시간);
  }

  async 닫기누르기(): Promise<void> {
    if (!(await this.닫기있나(10_000))) throw new Error('글쓰기 닫기 버튼이 안 보인다');
    await this.driver.$(글쓰기화면.닫기버튼).click();
  }

  async 뒤로가기누르기(): Promise<void> {
    await this.driver.back();
  }

  async 게시있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.게시버튼, 시간);
  }

  async 게시버튼글(): Promise<string> {
    return (await this.driver.$(글쓰기화면.게시버튼).getAttribute('content-desc')) ?? '';
  }

  async 게시켜졌나(): Promise<boolean> {
    return (await this.driver.$(글쓰기화면.게시버튼).getAttribute('enabled')) === 'true';
  }

  async 게시켜질때까지(시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, () => this.게시켜졌나(), 시간);
  }

  async 게시꺼질때까지(시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, async () => !(await this.게시켜졌나()), 시간);
  }

  async 게시누르기(): Promise<void> {
    await this.driver.$(글쓰기화면.게시버튼).click();
  }

  async 게시두번누르기(): Promise<void> {
    await 두번누르기(await this.driver.$(글쓰기화면.게시버튼).getElement());
  }

  async 글쓴이이름글(): Promise<string> {
    return this.driver.$(글쓰기화면.글쓴이이름).getText();
  }

  async 글쓴이계정글(): Promise<string> {
    return this.driver.$(글쓰기화면.글쓴이계정).getText();
  }

  async 글쓴이아바타있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.글쓴이아바타, 5_000);
  }

  async 답장머리글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 글쓰기화면.답장머리, 10_000))) return '';
    return this.driver.$(글쓰기화면.답장머리).getText();
  }

  async 답장원문글(): Promise<string> {
    return this.driver.$(글쓰기화면.답장원문).getText();
  }

  async 답장이름글(): Promise<string> {
    return this.driver.$(글쓰기화면.답장이름).getText();
  }

  async 본문칸글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 글쓰기화면.본문칸, 10_000))) return '';
    return this.driver.$(글쓰기화면.본문칸).getText();
  }

  async 본문적기(글: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 글쓰기화면.본문칸, 10_000))) throw new Error('글쓰기 본문 칸이 안 보인다');
    await 칸에적기(await this.driver.$(글쓰기화면.본문칸).getElement(), 글);
  }

  async 본문쳐넣기(글: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 글쓰기화면.본문칸, 10_000))) throw new Error('글쓰기 본문 칸이 안 보인다');
    await this.driver.$(글쓰기화면.본문칸).click();
    await 포커스칸에치기(this.driver, 글);
  }

  async 본문비우기(): Promise<void> {
    await 칸비우기(await this.driver.$(글쓰기화면.본문칸).getElement());
  }

  async 글자수글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 글쓰기화면.글자수, 10_000))) return '';
    return this.driver.$(글쓰기화면.글자수).getText();
  }

  async 글자수가될때까지(값: number, 시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, async () => (await this.글자수글()) === String(값), 시간);
  }

  async 도구있나(이름: 글쓰기도구, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.도구(이름), 시간);
  }

  async 도구켜졌나(이름: 글쓰기도구): Promise<boolean> {
    return (await this.driver.$(글쓰기화면.도구(이름)).getAttribute('enabled')) === 'true';
  }

  async 도구골라졌나(이름: 글쓰기도구): Promise<boolean> {
    return (await this.driver.$(글쓰기화면.도구(이름)).getAttribute('selected')) === 'true';
  }

  async 도구누르기(이름: 글쓰기도구): Promise<void> {
    if (!(await this.도구있나(이름, 10_000))) throw new Error(`글쓰기 도구 「${도구설명[이름]}」이 안 보인다`);
    await this.driver.$(글쓰기화면.도구(이름)).click();
  }

  async 도구길게누르기(이름: 글쓰기도구): Promise<void> {
    await 길게누르기(this.driver, 글쓰기화면.도구(이름));
  }

  async 공개범위있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.공개범위버튼, 시간);
  }

  async 공개범위글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 글쓰기화면.공개범위글, 10_000))) return '';
    return this.driver.$(글쓰기화면.공개범위글).getText();
  }

  async 공개범위켜졌나(): Promise<boolean> {
    return (await this.driver.$(글쓰기화면.공개범위버튼).getAttribute('enabled')) === 'true';
  }

  async 공개범위누르기(): Promise<void> {
    await this.driver.$(글쓰기화면.공개범위버튼).click();
  }

  async 열람주의칸있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.열람주의칸, 시간);
  }

  async 열람주의칸사라질때까지(시간 = 5_000): Promise<boolean> {
    return 사라질때까지(this.driver, 글쓰기화면.열람주의칸, 시간);
  }

  async 열람주의칸글(): Promise<string> {
    return this.driver.$(글쓰기화면.열람주의칸).getText();
  }

  async 열람주의적기(글: string): Promise<void> {
    if (!(await this.열람주의칸있나(10_000))) throw new Error('열람 주의 칸이 안 보인다');
    await 칸에적기(await this.driver.$(글쓰기화면.열람주의칸).getElement(), 글);
  }

  async 자동완성떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.자동완성구분선, 시간);
  }

  async 자동완성에글자있나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.자동완성글(글자), 시간);
  }

  async 자동완성줄누르기(글자: string): Promise<void> {
    if (!(await this.자동완성에글자있나(글자))) throw new Error(`자동 완성 줄 「${글자}」이 안 보인다`);
    await this.driver.$(글쓰기화면.자동완성글(글자)).click();
  }

  async 인용카드있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.인용카드, 시간);
  }

  async 인용카드사라질때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 글쓰기화면.인용카드, 시간);
  }

  async 인용카드글(): Promise<string> {
    return this.driver.$(글쓰기화면.인용카드글).getText();
  }

  async 인용카드이름(): Promise<string> {
    return this.driver.$(글쓰기화면.인용카드이름).getText();
  }

  async 인용취소있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.인용취소, 시간);
  }

  async 인용취소누르기(): Promise<void> {
    if (!(await this.인용취소있나(10_000))) throw new Error('인용 카드의 「인용 취소」가 안 보인다');
    await this.driver.$(글쓰기화면.인용취소).click();
  }

  닫기확인창(): 확인창 {
    return new 확인창(this.driver);
  }

  작성실패창(): 확인창 {
    return new 확인창(this.driver);
  }

  영어확인창(): 확인창 {
    return new 확인창(this.driver);
  }

  조용한공개인용창(): 확인창 {
    return new 확인창(this.driver);
  }

  대체텍스트리마인더창(): 확인창 {
    return new 확인창(this.driver);
  }

  async 창에글자있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기화면.창글자(글자), 시간);
  }

  async 토스트글(): Promise<string> {
    return 토스트읽기(this.driver);
  }

  async 토스트에글자있나(글자: string, 시간 = 8_000): Promise<boolean> {
    return 토스트에글자있나(this.driver, 글자, 시간);
  }
}
