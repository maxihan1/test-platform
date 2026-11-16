import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 해시태그화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'id=org.joinmastodon.android:id/title';
  readonly 요약 = 'id=org.joinmastodon.android:id/subtitle';
  readonly 동작버튼 = 'id=org.joinmastodon.android:id/profile_action_btn';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(this.제목).getText();
  }

  async 요약글(): Promise<string> {
    return this.driver.$(this.요약).getText();
  }

  async 동작글(): Promise<string> {
    return this.driver.$(this.동작버튼).getText();
  }

  async 동작누르기(): Promise<void> {
    await this.driver.$(this.동작버튼).click();
  }
}
