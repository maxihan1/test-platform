import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 칸비우기, 클립보드쓰기, 키누르기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';

export class 대체텍스트화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 뒤로 = '~뒤로 가기';
  readonly 제목글 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 도움말 = 'id=org.joinmastodon.android:id/help';
  readonly 미리보기 = 'id=org.joinmastodon.android:id/photo';
  readonly 입력칸 = 'id=org.joinmastodon.android:id/edit';
  readonly 확대막 = 'id=org.joinmastodon.android:id/photo_viewer_overlay';
  readonly 창: 확인창;

  constructor(private readonly driver: AppDriver) {
    this.창 = new 확인창(driver);
  }

  async 그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.입력칸, 시간);
  }

  async 적기(글: string): Promise<void> {
    const 칸 = await this.driver.$(this.입력칸).getElement();
    await 칸비우기(칸);
    await 클립보드쓰기(this.driver, 글);
    await 칸.click();
    await 키누르기(this.driver, '붙여 넣기');
  }

  async 입력칸글(): Promise<string> {
    return this.driver.$(this.입력칸).getText();
  }

  async 미리보기누르기(): Promise<void> {
    await this.driver.$(this.미리보기).click();
  }

  async 확대됐나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.확대막, 시간);
  }

  async 도움말열기(): Promise<boolean> {
    await this.driver.$(this.도움말).click();
    return this.창.뜰때까지();
  }

  async 도움말제목글(): Promise<string> {
    return this.driver.$(this.창.제목).getText();
  }

  async 돌아가기(): Promise<void> {
    await this.driver.$(this.뒤로).click();
  }
}
