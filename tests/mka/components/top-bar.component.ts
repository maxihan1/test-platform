import type { 앱 } from '../helpers/app.helper.js';

export class 머리줄 {
  constructor(private readonly driver: 앱) {}

  get 제목() {
    return this.driver.$('~screen_title');
  }

  get 뒤로() {
    return this.driver.$('~back_button');
  }

  async 제목글(): Promise<string> {
    await this.제목.waitForDisplayed({ timeout: 15000 });
    return this.제목.getText();
  }

  async 뒤로누르기(): Promise<void> {
    await this.뒤로.click();
  }
}
