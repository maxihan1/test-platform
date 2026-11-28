import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 모든글자, 앱id } from '../helpers/app.helper.js';
import { 위로이동, 줄누르기, 줄부제, 줄있나, 툴바글자 } from '../helpers/system-ui.helper.js';

export class 게시기본값화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('게시 기본값');
  static readonly 목록 = 앱id('list');
  static readonly 배너 = 앱id('text');
  static readonly 게시범위줄 = '게시 범위';
  static readonly 공개범위줄 = '공개 범위';
  static readonly 게시언어줄 = '게시 언어';
  static readonly 창줄제목들 = 앱id('text');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 게시기본값화면.제목, 시간);
  }

  async 배너글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 게시기본값화면.배너, 10_000))) return '';
    return this.driver.$(게시기본값화면.배너).getText();
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 게시범위글(): Promise<string> {
    return 줄부제(this.driver, 게시기본값화면.게시범위줄);
  }

  async 공개범위글(): Promise<string> {
    return 줄부제(this.driver, 게시기본값화면.공개범위줄);
  }

  async 게시언어글(): Promise<string> {
    return 줄부제(this.driver, 게시기본값화면.게시언어줄);
  }

  async 게시범위누르기(): Promise<void> {
    await 줄누르기(this.driver, 게시기본값화면.게시범위줄);
  }

  async 공개범위누르기(): Promise<void> {
    await 줄누르기(this.driver, 게시기본값화면.공개범위줄);
  }

  async 게시언어누르기(): Promise<void> {
    await 줄누르기(this.driver, 게시기본값화면.게시언어줄);
  }

  async 선택창떴나(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 게시기본값화면.목록, 시간);
  }

  async 선택창줄글들(): Promise<string[]> {
    return 모든글자(this.driver, 게시기본값화면.창줄제목들);
  }

  async 선택창고르기(글자: string): Promise<void> {
    const 주소 = `android=new UiSelector().resourceId("org.joinmastodon.android:id/text").text(${JSON.stringify(글자)})`;
    if (!(await 뜰때까지(this.driver, 주소, 10_000))) throw new Error(`선택 창 줄 「${글자}」이 안 보인다`);
    await this.driver.$(주소).click();
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
