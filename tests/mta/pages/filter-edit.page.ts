import type { AppDriver } from '@platform/kit/app';
import { 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 꾸러미, 모든요소, 앱id } from '../helpers/app.helper.js';
import {
  고르기창글들,
  고르기창줄누르기,
  고르기창떴나,
  위로이동,
  줄누르기,
  줄부제,
  줄스위치누르기,
  줄스위치켜졌나,
  줄있나,
  툴바글자,
} from '../helpers/system-ui.helper.js';

export class 필터편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 추가제목 = 툴바글자('필터 추가');
  static readonly 저장 = 앱id('save');
  static readonly 제목칸 = 앱id('edit');
  static readonly 기간줄 = '기간';
  static readonly 뮤트단어줄 = '뮤트된 단어';
  static readonly 경고줄 = '내용 경고 표시';
  static readonly 범위줄 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").textMatches(".*를 뮤트"))`;

  constructor(private readonly driver: AppDriver) {}

  async 추가화면떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터편집화면.추가제목, 시간);
  }

  async 제목칸있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터편집화면.제목칸, 시간);
  }

  async 제목칸글(): Promise<string> {
    return this.driver.$(필터편집화면.제목칸).getText();
  }

  async 제목적기(글: string): Promise<void> {
    if (!(await this.제목칸있나())) throw new Error('필터 제목 칸이 안 보인다');
    await 칸에적기(await this.driver.$(필터편집화면.제목칸).getElement(), 글);
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 저장있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터편집화면.저장, 시간);
  }

  async 저장누르기(): Promise<void> {
    if (!(await this.저장있나(10_000))) throw new Error('필터 편집 「저장」이 안 보인다');
    await this.driver.$(필터편집화면.저장).click();
  }

  async 저장빠르게두번누르기(): Promise<void> {
    const 칸 = await this.driver.$(필터편집화면.저장).getElement();
    await Promise.allSettled([칸.click(), 칸.click()]);
  }

  async 기간글(): Promise<string> {
    return 줄부제(this.driver, 필터편집화면.기간줄);
  }

  async 기간누르기(): Promise<void> {
    await 줄누르기(this.driver, 필터편집화면.기간줄);
  }

  async 기간창떴나(시간 = 10_000): Promise<boolean> {
    return 고르기창떴나(this.driver, 시간);
  }

  async 기간선택지(): Promise<string[]> {
    return 고르기창글들(this.driver);
  }

  async 기간고르기(글자: string): Promise<void> {
    await 고르기창줄누르기(this.driver, 글자);
  }

  async 뮤트단어글(): Promise<string> {
    return 줄부제(this.driver, 필터편집화면.뮤트단어줄);
  }

  async 뮤트단어누르기(): Promise<void> {
    await 줄누르기(this.driver, 필터편집화면.뮤트단어줄);
  }

  async 범위줄있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터편집화면.범위줄, 시간);
  }

  async 범위글(): Promise<string> {
    if (!(await this.범위줄있나(10_000))) return '';
    const 제목 = await this.driver.$(필터편집화면.범위줄).getElement();
    const 아래 = (await 제목.getLocation()).y + (await 제목.getSize()).height;
    for (const 부제 of await 모든요소(this.driver, 앱id('subtitle'))) {
      if (Math.abs((await 부제.getLocation()).y - 아래) < 25) return 부제.getText();
    }
    return '';
  }

  async 범위누르기(): Promise<void> {
    if (!(await this.범위줄있나(10_000))) throw new Error('필터 편집 범위 줄이 안 보인다');
    await this.driver.$(필터편집화면.범위줄).click();
  }

  async 경고스위치켜졌나(): Promise<boolean> {
    return 줄스위치켜졌나(this.driver, 필터편집화면.경고줄);
  }

  async 경고스위치누르기(): Promise<void> {
    await 줄스위치누르기(this.driver, 필터편집화면.경고줄);
  }

  async 삭제누르기(): Promise<void> {
    await 줄누르기(this.driver, '필터 삭제');
  }

  나가기확인창(): 확인창 {
    return new 확인창(this.driver);
  }

  삭제확인창(): 확인창 {
    return new 확인창(this.driver);
  }

  async 뒤로가기누르기(): Promise<void> {
    await this.driver.back();
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
