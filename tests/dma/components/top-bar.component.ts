import type { 앱 } from '../helpers/app.helper.js';

export class 맨위줄 {
  constructor(private readonly driver: 앱) {}

  get 제목() {
    return this.driver.$('id=screen_title');
  }

  get 뒤로버튼() {
    return this.driver.$('id=back_button');
  }

  async 제목글(): Promise<string> {
    await this.제목.waitForDisplayed({ timeout: 15000 });
    return this.제목.getText();
  }

  async 뒤로버튼보이나(): Promise<boolean> {
    return this.뒤로버튼.isDisplayed();
  }

  async 뒤로버튼이왼쪽인가(): Promise<boolean> {
    const 뒤로 = await this.뒤로버튼.getLocation();
    const 제목 = await this.제목.getLocation();
    return 뒤로.x < 제목.x;
  }

  async 뒤로(): Promise<void> {
    await this.뒤로버튼.click();
  }
}
