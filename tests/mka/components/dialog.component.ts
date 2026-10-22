import type { 앱 } from '../helpers/app.helper.js';

export class 확인창 {
  constructor(private readonly driver: 앱) {}

  get 문구() {
    return this.driver.$('~dialog_message');
  }

  get 확인() {
    return this.driver.$('~dialog_confirm');
  }

  get 취소() {
    return this.driver.$('~dialog_cancel');
  }

  async 뜰때까지(시간 = 15000): Promise<boolean> {
    return this.확인.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 닫힐때까지(시간 = 15000): Promise<boolean> {
    return this.취소.waitForDisplayed({ timeout: 시간, reverse: true }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.취소.isDisplayed().catch(() => false);
  }
}
