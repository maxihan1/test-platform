import type { AppDriver } from '@platform/kit/app';
import { 사라질때까지, 뜰때까지 } from '@platform/kit/parts';

import { 글읽기, 누르기, 앱id, 있나 } from '../helpers/app.helper.js';

export type 뷰어버튼 = '뒤로' | '다운로드' | '답장' | '부스트' | '좋아요' | '북마크' | '공유' | '대체 텍스트';

const 버튼주소: Record<뷰어버튼, string> = {
  뒤로: 앱id('btn_back'),
  다운로드: 앱id('btn_download'),
  답장: 앱id('reply_btn'),
  부스트: 앱id('boost_btn'),
  좋아요: 앱id('favorite_btn'),
  북마크: 앱id('bookmark_btn'),
  공유: 앱id('share_btn'),
  '대체 텍스트': 앱id('alt_text'),
};

export class 미디어뷰어화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/photo_viewer_overlay';
  static readonly 덮개 = 앱id('photo_viewer_overlay');
  static readonly 대체텍스트 = 앱id('alt_text');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 미디어뷰어화면.덮개, 시간);
  }

  async 닫힐때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 미디어뷰어화면.덮개, 시간);
  }

  async 버튼있나(버튼: 뷰어버튼): Promise<boolean> {
    return 있나(this.driver, 버튼주소[버튼]);
  }

  async 버튼글(버튼: 뷰어버튼): Promise<string> {
    return 글읽기(this.driver, 버튼주소[버튼], 10_000);
  }

  async 버튼설명(버튼: 뷰어버튼): Promise<string> {
    if (!(await 뜰때까지(this.driver, 버튼주소[버튼], 10_000))) return '';
    return (await this.driver.$(버튼주소[버튼]).getAttribute('content-desc')) ?? '';
  }

  async 누르기(버튼: 뷰어버튼): Promise<void> {
    await 누르기(this.driver, 버튼주소[버튼], 10_000);
  }

  async 대체텍스트글(): Promise<string> {
    return 글읽기(this.driver, 미디어뷰어화면.대체텍스트, 10_000);
  }

  async 사진눌러열기(번 = 0): Promise<void> {
    await 누르기(this.driver, `android=new UiSelector().resourceId("org.joinmastodon.android:id/photo").instance(${String(번)})`, 15_000);
    if (!(await this.떴나())) throw new Error('미디어 뷰어가 안 열렸다');
  }
}
