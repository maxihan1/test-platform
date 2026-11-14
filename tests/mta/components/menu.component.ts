import { 글자가든요소, 글자들, 글자로고르기, type 앱 } from '../helpers/app.helper.js';

export class 메뉴 {
  readonly 항목들 = 'id=android:id/title';

  constructor(private readonly driver: 앱) {}

  async 항목글자(): Promise<string[]> {
    await this.driver.$(this.항목들).waitForDisplayed({ timeout: 10_000 });
    return 글자들(this.driver, this.항목들);
  }

  async 고르기(글자: string): Promise<void> {
    const 보이는 = await 글자로고르기(this.driver, this.항목들, 글자, 3_000).catch(() => undefined);
    if (보이는) {
      await 보이는.click();
      return;
    }
    await (await 글자가든요소(this.driver, 글자)).click();
  }
}
