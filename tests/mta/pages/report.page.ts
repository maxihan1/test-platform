import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지, 칸에적기 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 목록안글자, 앱id, 토스트글읽기 } from '../helpers/app.helper.js';

export class 신고화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 진행막대 = 앱id('top_progress');
  static readonly 질문 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").instance(0))`;
  static readonly 안내 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle").instance(0))`;
  static readonly 다음버튼 = 앱id('btn_next');
  static readonly 체크들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/checkbox"))`;
  static readonly 글본문들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/text"))`;
  static readonly 의견칸 = `android=new UiSelector().resourceId("${꾸러미}:id/text").className("android.widget.EditText")`;
  static readonly 완료도장 = 앱id('reported_stamp');
  static readonly 완료제목 = 앱id('title');
  static readonly 완료안내 = 앱id('subtitle');
  static readonly 팔로우해제줄 = 앱id('unfollow_btn');
  static readonly 팔로우해제글 = 앱id('unfollow_title');
  static readonly 차단줄 = 앱id('block_btn');
  static readonly 차단글 = 앱id('block_title');
  static readonly 차단설명 = 앱id('block_explanation');
  static readonly 뮤트줄 = 앱id('mute_btn');
  static readonly 뮤트글 = 앱id('mute_title');
  static readonly 뮤트설명 = 앱id('mute_explanation');
  static readonly 토스트 = '//android.widget.Toast';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 신고화면.다음버튼, 시간);
  }

  async 위막대제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 신고화면.위막대제목, 10_000))) return '';
    return this.driver.$(신고화면.위막대제목).getText();
  }

  async 진행률글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 신고화면.진행막대, 10_000))) return '';
    return this.driver.$(신고화면.진행막대).getText();
  }

  async 질문글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 신고화면.질문, 10_000))) return '';
    return this.driver.$(신고화면.질문).getText();
  }

  async 안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 신고화면.안내, 10_000))) return '';
    return this.driver.$(신고화면.안내).getText();
  }

  async 이유있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'list'), 시간);
  }

  async 이유누르기(글자: string): Promise<void> {
    if (!(await this.이유있나(글자, 10_000))) throw new Error(`신고 이유 「${글자}」가 안 보인다`);
    await this.driver.$(목록안글자(글자, 'list')).click();
  }

  async 다음켜져있나(): Promise<boolean> {
    return (await this.driver.$(신고화면.다음버튼).getAttribute('enabled')) === 'true';
  }

  async 다음글(): Promise<string> {
    return this.driver.$(신고화면.다음버튼).getText();
  }

  async 다음누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 신고화면.다음버튼, 10_000))) throw new Error('신고 「다음」 버튼이 안 보인다');
    await this.driver.$(신고화면.다음버튼).click();
  }

  async 질문될때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'list'), 시간);
  }

  async 글체크수(): Promise<number> {
    return (await 모든요소(this.driver, 신고화면.체크들)).length;
  }

  async 체크된글수(): Promise<number> {
    let 수 = 0;
    for (const 체크 of await 모든요소(this.driver, 신고화면.체크들)) {
      if ((await 체크.getAttribute('checked')) === 'true' || (await 체크.getAttribute('selected')) === 'true') 수++;
    }
    return 수;
  }

  async 글본문글들(): Promise<string[]> {
    return 모든글자(this.driver, 신고화면.글본문들);
  }

  async 의견칸있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 신고화면.의견칸, 시간);
  }

  async 의견힌트글(): Promise<string> {
    if (!(await this.의견칸있나())) return '';
    return this.driver.$(신고화면.의견칸).getText();
  }

  async 의견적기(글: string): Promise<void> {
    if (!(await this.의견칸있나())) throw new Error('신고 의견 칸이 안 보인다');
    await 칸에적기(await this.driver.$(신고화면.의견칸).getElement(), 글);
  }

  async 완료떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, 신고화면.완료도장, 시간);
  }

  async 완료도장글(): Promise<string> {
    if (!(await this.완료떴나())) return '';
    return this.driver.$(신고화면.완료도장).getText();
  }

  async 완료제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 신고화면.완료제목, 10_000))) return '';
    return this.driver.$(신고화면.완료제목).getText();
  }

  async 완료안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 신고화면.완료안내, 10_000))) return '';
    return this.driver.$(신고화면.완료안내).getText();
  }

  async 팔로우해제줄있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 신고화면.팔로우해제줄, 시간);
  }

  async 차단줄있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 신고화면.차단줄, 시간);
  }

  async 뮤트줄있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 신고화면.뮤트줄, 시간);
  }

  async 팔로우해제줄글(): Promise<string> {
    return this.driver.$(신고화면.팔로우해제글).getText();
  }

  async 차단줄글(): Promise<string> {
    return this.driver.$(신고화면.차단글).getText();
  }

  async 뮤트줄글(): Promise<string> {
    return this.driver.$(신고화면.뮤트글).getText();
  }

  async 뮤트줄글될때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'mute_btn'), 시간);
  }

  async 팔로우해제줄누르기(): Promise<void> {
    await this.driver.$(신고화면.팔로우해제줄).click();
  }

  async 차단줄누르기(): Promise<void> {
    await this.driver.$(신고화면.차단줄).click();
  }

  async 뮤트줄누르기(): Promise<void> {
    await this.driver.$(신고화면.뮤트줄).click();
  }

  async 뮤트설명글(): Promise<string> {
    return this.driver.$(신고화면.뮤트설명).getText();
  }

  async 차단설명글(): Promise<string> {
    return this.driver.$(신고화면.차단설명).getText();
  }

  async 완료누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 신고화면.다음버튼, 10_000))) throw new Error('신고 「완료」 버튼이 안 보인다');
    await this.driver.$(신고화면.다음버튼).click();
  }

  async 완료사라질때까지(시간 = 15_000): Promise<boolean> {
    return 사라질때까지(this.driver, 신고화면.완료도장, 시간);
  }

  async 토스트글읽기(시간 = 10_000): Promise<string> {
    return 토스트글읽기(this.driver, 시간);
  }
}
