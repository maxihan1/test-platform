// appFns.test.ts 가 쓰는 가짜 앱 화면 파일 — WebdriverIO 명령을 부른 화면 파일 함수 이름이 절차 기록에 남는 꼴을 본다

import type { AppDriver } from '../../app.js';

export class 홈화면 {
  constructor(private readonly driver: AppDriver) {}

  static async 열기(driver: AppDriver): Promise<홈화면> {
    await driver.$('~홈').click();
    return new 홈화면(driver);
  }

  async 알림열기(): Promise<void> {
    await Promise.resolve();
    await this.driver.$('~알림').click();
  }

  async 제목읽기(): Promise<string> {
    const 제목 = await this.driver.$('~제목');
    return 제목.getText();
  }

  async 없는것누르기(): Promise<void> {
    await this.driver.$('~없음').click();
  }

  async 없는것기다리기(): Promise<void> {
    await this.driver.$('~없음').waitForDisplayed({ timeout: 200 });
  }
}
