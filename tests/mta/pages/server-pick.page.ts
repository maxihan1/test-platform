import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 칸비우기, 칸에적기, 키보드완료, 포커스칸에치기, 뜰때까지, 보이나, 사라질때까지, 요소안에서밀기, type 미는방향 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

abstract class 서버고르기 {
  static readonly 입력칸 = 앱id('search_edit');
  static readonly 카드제목 = 앱id('title');
  static readonly 다음버튼 = 앱id('btn_next');
  static readonly 빈목록글 = 앱id('empty_text');
  static readonly 진행창 = 'id=android:id/progress';
  static readonly 진행창글 = 'id=android:id/message';

  static 카드(호스트: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(호스트)})`;
  }

  protected constructor(protected readonly driver: AppDriver) {}

  async 입력칸글(): Promise<string> {
    return this.driver.$(서버고르기.입력칸).getText();
  }

  async 적기(값: string): Promise<void> {
    await 칸비우기(await this.driver.$(서버고르기.입력칸).getElement());
    if (값 === '') {
      if (await this.driver.isKeyboardShown()) await this.driver.hideKeyboard();
      return;
    }
    await this.driver.$(서버고르기.입력칸).click();
    await 포커스칸에치기(this.driver, 값);
  }

  async 완료누르기(): Promise<void> {
    await 키보드완료(this.driver);
  }

  async 빈목록글읽기(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 서버고르기.빈목록글, 시간))) return '';
    return this.driver.$(서버고르기.빈목록글).getText();
  }

  async 카드제목들(): Promise<string[]> {
    return 모든글자(this.driver, 서버고르기.카드제목);
  }

  async 맨위카드제목(): Promise<string> {
    return (await this.카드제목들())[0] ?? '';
  }

  async 카드있나(호스트: string, 시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, 서버고르기.카드(호스트), 시간);
  }

  async 카드사라질때까지(호스트: string, 시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 서버고르기.카드(호스트), 시간);
  }

  async 카드고르기(호스트: string): Promise<void> {
    if (!(await this.카드있나(호스트))) throw new Error(`서버 카드 「${호스트}」가 안 보인다`);
    await this.driver.$(서버고르기.카드(호스트)).click();
  }

  async 다음켜졌나(): Promise<boolean> {
    return (await this.driver.$(서버고르기.다음버튼).getAttribute('enabled')) === 'true';
  }

  async 다음켜질때까지(시간 = 15_000): Promise<boolean> {
    return 될때까지(this.driver, () => this.다음켜졌나(), 시간);
  }

  async 다음글(): Promise<string> {
    return this.driver.$(서버고르기.다음버튼).getText();
  }

  async 다음누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 서버고르기.다음버튼, 10_000))) throw new Error('서버 고르기 「다음」이 안 보인다');
    await this.driver.$(서버고르기.다음버튼).click();
  }

  async 진행창떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 서버고르기.진행창, 시간);
  }

  async 진행창글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 서버고르기.진행창글, 5_000))) return '';
    return this.driver.$(서버고르기.진행창글).getText();
  }

  async 진행창사라질때까지(시간 = 30_000): Promise<boolean> {
    return 사라질때까지(this.driver, 서버고르기.진행창, 시간);
  }
}

export class 가입서버고르기 extends 서버고르기 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 뒤로버튼 = 앱id('btn_back');
  static readonly 초대링크버튼 = 앱id('btn_use_invite');
  static readonly 필터영역 = 앱id('filters_scroll');
  static readonly 필터칩들 = `android=new UiSelector().resourceId("${꾸러미}:id/filters_container").childSelector(new UiSelector().className("android.widget.TextView"))`;

  static 필터칩(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/filters_container").childSelector(new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)}))`;
  }

  constructor(driver: AppDriver) {
    super(driver);
  }

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 될때까지(this.driver, async () => (await 보이나(this.driver, 서버고르기.입력칸)) && (await 보이나(this.driver, 가입서버고르기.초대링크버튼)), 시간);
  }

  static 필터칩순서(순서: number): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/filters_container").childSelector(new UiSelector().className("android.widget.TextView").instance(${순서}))`;
  }

  async 필터칩글들(): Promise<string[]> {
    const 글들: string[] = [];
    for (let 순서 = 0; 순서 < 12; 순서++) {
      const 칩 = this.driver.$(가입서버고르기.필터칩순서(순서));
      if (!(await 칩.isExisting())) break;
      글들.push(await 칩.getText());
    }
    return 글들;
  }

  static readonly 메뉴항목 = 'id=android:id/title';
  static readonly 유럽칩까지 = `android=new UiScrollable(new UiSelector().resourceId("${꾸러미}:id/filters_scroll")).setAsHorizontalList().scrollIntoView(new UiSelector().text("유럽"))`;

  async 지역칩까지굴리기(): Promise<void> {
    await this.driver.$(가입서버고르기.유럽칩까지).isExisting();
  }

  async 속도칩메뉴글들(): Promise<string[]> {
    await this.driver.$(가입서버고르기.필터칩순서(1)).click();
    if (!(await 뜰때까지(this.driver, 가입서버고르기.메뉴항목, 5_000))) return [];
    const 글들 = await 모든글자(this.driver, 가입서버고르기.메뉴항목);
    await this.driver.back();
    await 사라질때까지(this.driver, 가입서버고르기.메뉴항목, 5_000);
    return 글들;
  }

  async 필터칩있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 가입서버고르기.필터칩(글자), 시간);
  }

  async 필터칩골라졌나(글자: string): Promise<boolean> {
    return (await this.driver.$(가입서버고르기.필터칩(글자)).getAttribute('selected')) === 'true';
  }

  async 필터칩누르기(글자: string): Promise<void> {
    if (!(await this.필터칩있나(글자, 10_000))) throw new Error(`필터 칩 「${글자}」가 안 보인다`);
    await this.driver.$(가입서버고르기.필터칩(글자)).click();
  }

  async 필터칩밀기(방향: 미는방향): Promise<void> {
    await 요소안에서밀기(this.driver, 가입서버고르기.필터영역, 방향);
  }

  async 초대링크누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 가입서버고르기.초대링크버튼, 10_000))) throw new Error('「초대 링크 사용하기」가 안 보인다');
    await this.driver.$(가입서버고르기.초대링크버튼).click();
  }

  async 초대링크버튼글(): Promise<string> {
    return this.driver.$(가입서버고르기.초대링크버튼).getText();
  }

  async 뒤로가기(): Promise<void> {
    await this.driver.$(가입서버고르기.뒤로버튼).click();
  }
}

export class 로그인서버고르기 extends 서버고르기 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 안내글 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().className("android.widget.TextView").instance(0))`;
  static readonly 필터영역 = 앱id('filters_scroll');

  constructor(driver: AppDriver) {
    super(driver);
  }

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 될때까지(
      this.driver,
      async () => (await 보이나(this.driver, 로그인서버고르기.제목)) && (await 보이나(this.driver, 서버고르기.입력칸)) && !(await 보이나(this.driver, 로그인서버고르기.필터영역)),
      시간,
    );
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 로그인서버고르기.제목, 10_000))) return '';
    return this.driver.$(로그인서버고르기.제목).getText();
  }

  async 안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 로그인서버고르기.안내글, 10_000))) return '';
    return this.driver.$(로그인서버고르기.안내글).getText();
  }

  async 필터칩있나(): Promise<boolean> {
    return 보이나(this.driver, 로그인서버고르기.필터영역);
  }
}

export class 초대링크창 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/label';
  static readonly 제목 = 'android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().className("android.widget.TextView").instance(0))';
  static readonly 입력칸 = 앱id('edit');
  static readonly 칸이름 = 앱id('label');
  static readonly 안내 = 앱id('supporting_text');
  static readonly 지우기 = '~모두 지우기';
  static readonly 취소버튼 = 'id=android:id/button2';
  static readonly 다음버튼 = 'id=android:id/button1';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 초대링크창.입력칸, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(초대링크창.제목).getText();
  }

  async 칸이름글(): Promise<string> {
    return this.driver.$(초대링크창.칸이름).getText();
  }

  async 입력칸글(): Promise<string> {
    return this.driver.$(초대링크창.입력칸).getText();
  }

  async 적기(값: string): Promise<void> {
    await 칸에적기(await this.driver.$(초대링크창.입력칸).getElement(), 값);
  }

  async 다음누르기(): Promise<void> {
    await this.driver.$(초대링크창.다음버튼).click();
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(초대링크창.취소버튼).click();
  }

  async 안내글(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 초대링크창.안내, 시간))) return '';
    return this.driver.$(초대링크창.안내).getText();
  }

  async 닫힐때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 초대링크창.입력칸, 시간);
  }
}

export class 서버오류창 {
  static readonly 제목 = `android=new UiSelector().resourceId("android:id/topPanel").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 글 = 'id=android:id/message';
  static readonly 확인버튼 = 'id=android:id/button1';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 서버오류창.글, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 서버오류창.제목, 3_000))) return '';
    return this.driver.$(서버오류창.제목).getText();
  }

  async 글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 서버오류창.글, 5_000))) return '';
    return this.driver.$(서버오류창.글).getText();
  }

  async 확인누르기(): Promise<void> {
    await this.driver.$(서버오류창.확인버튼).click();
  }
}
