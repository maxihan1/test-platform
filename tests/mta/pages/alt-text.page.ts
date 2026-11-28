import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 칸에적기, 클립보드쓰기, 키누르기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 앱id } from '../helpers/app.helper.js';
import { 툴바글자 } from '../helpers/system-ui.helper.js';

export class 대체텍스트화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('대체 텍스트 추가');
  static readonly 미리보기 = 앱id('photo');
  static readonly 입력칸 = 앱id('edit');
  static readonly 도움말 = 앱id('help');
  static readonly 뒤로 = '~뒤로 가기';
  static readonly 사진보기 = 앱id('photo_viewer_overlay');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 대체텍스트화면.제목, 시간);
  }

  async 미리보기있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 대체텍스트화면.미리보기, 시간);
  }

  async 칸글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 대체텍스트화면.입력칸, 10_000))) return '';
    return this.driver.$(대체텍스트화면.입력칸).getText();
  }

  async 칸에쓰기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(대체텍스트화면.입력칸).getElement(), 글);
  }

  async 칸에붙여넣기(글: string): Promise<void> {
    await 클립보드쓰기(this.driver, 글);
    await this.driver.$(대체텍스트화면.입력칸).click();
    await 키누르기(this.driver, '붙여 넣기');
  }

  async 도움말누르기(): Promise<확인창> {
    await this.driver.$(대체텍스트화면.도움말).click();
    return new 확인창(this.driver);
  }

  async 미리보기누르기(): Promise<void> {
    await this.driver.$(대체텍스트화면.미리보기).click();
  }

  async 사진보기떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 대체텍스트화면.사진보기, 시간);
  }

  async 닫기(): Promise<void> {
    await this.driver.$(대체텍스트화면.뒤로).click();
  }
}
