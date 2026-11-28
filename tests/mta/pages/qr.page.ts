import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 앱id, 목록안글자 } from '../helpers/app.helper.js';

export class QR화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/particle_animation_container';
  static readonly 코드 = 앱id('code');
  static readonly 사용자명 = 앱id('username');
  static readonly 서버 = 앱id('domain');
  static readonly 공유버튼 = 앱id('share_btn');
  static readonly 공유글 = `android=new UiSelector().resourceId("org.joinmastodon.android:id/share_btn").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 저장버튼 = 앱id('save_btn');
  static readonly 저장글 = 앱id('save_text');
  static readonly 스캔 = '~QR 코드 스캔';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, QR화면.코드, 시간);
  }

  async 사용자명글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(QR화면.사용자명).getText();
  }

  async 서버글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(QR화면.서버).getText();
  }

  async 공유글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, QR화면.공유글, 5_000))) return '';
    return this.driver.$(QR화면.공유글).getText();
  }

  async 공유누르기(): Promise<void> {
    await this.driver.$(QR화면.공유버튼).click();
  }

  async 저장글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, QR화면.저장글, 5_000))) return '';
    return this.driver.$(QR화면.저장글).getText();
  }

  async 저장누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, QR화면.저장버튼, 10_000))) throw new Error('QR 화면 「저장」 버튼이 안 보인다');
    await this.driver.$(QR화면.저장버튼).click();
  }

  async 저장글될때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'save_btn'), 시간);
  }

  async 스캔있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, QR화면.스캔, 시간);
  }

  async 스캔누르기(): Promise<void> {
    await this.driver.$(QR화면.스캔).click();
  }
}
