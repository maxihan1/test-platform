import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 보이나, 뜰때까지, 움직이는화면에서 } from '@platform/kit/parts';

import { 앱id, 토스트글읽기 } from '../helpers/app.helper.js';

export class 시작화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 기본서버버튼 = 앱id('btn_join_default_server');
  static readonly 다른서버버튼 = 앱id('btn_get_started');
  static readonly 더알아보기버튼 = 앱id('btn_learn_more');
  static readonly 로그인버튼 = 앱id('btn_log_in');
  static readonly 토스트상자 = '//android.widget.Toast';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 60_000): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 뜰때까지(this.driver, 시작화면.로그인버튼, 시간));
  }

  async 사라질때까지(시간 = 15_000): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 될때까지(this.driver, async () => !(await 보이나(this.driver, 시작화면.로그인버튼)), 시간));
  }

  async 기본서버버튼보이나(): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 보이나(this.driver, 시작화면.기본서버버튼));
  }

  async 다른서버버튼보이나(): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 보이나(this.driver, 시작화면.다른서버버튼));
  }

  async 더알아보기버튼보이나(): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 보이나(this.driver, 시작화면.더알아보기버튼));
  }

  async 로그인버튼보이나(): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 보이나(this.driver, 시작화면.로그인버튼));
  }

  async 기본서버버튼글(): Promise<string> {
    return 움직이는화면에서(this.driver, () => this.driver.$(시작화면.기본서버버튼).getText());
  }

  async 다른서버버튼글(): Promise<string> {
    return 움직이는화면에서(this.driver, () => this.driver.$(시작화면.다른서버버튼).getText());
  }

  async 더알아보기버튼글(): Promise<string> {
    return 움직이는화면에서(this.driver, () => this.driver.$(시작화면.더알아보기버튼).getText());
  }

  async 로그인버튼글(): Promise<string> {
    return 움직이는화면에서(this.driver, () => this.driver.$(시작화면.로그인버튼).getText());
  }

  async 기본서버누르기(): Promise<void> {
    await this.누르기(시작화면.기본서버버튼, '기본 서버');
  }

  async 다른서버선택누르기(): Promise<void> {
    await this.누르기(시작화면.다른서버버튼, '다른 서버 선택하기');
  }

  async 더알아보기누르기(): Promise<void> {
    await this.누르기(시작화면.더알아보기버튼, '더 알아보기');
  }

  async 로그인누르기(): Promise<void> {
    await this.누르기(시작화면.로그인버튼, '로그인');
  }

  async 토스트(시간 = 10_000): Promise<string> {
    return 움직이는화면에서(this.driver, () => 토스트글읽기(this.driver, 시간), 0);
  }

  private async 누르기(주소: string, 이름: string): Promise<void> {
    await 움직이는화면에서(this.driver, async () => {
      if (!(await 뜰때까지(this.driver, 주소, 15_000))) throw new Error(`시작 화면 「${이름}」 버튼이 안 보인다`);
      await this.driver.$(주소).click();
    });
  }
}

export class 더알아보기시트 {
  static readonly 주소 = 'app:.MainActivity/a84c2fdc51e9';
  static readonly 글들 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().className("android.widget.TextView"))';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 움직이는화면에서(this.driver, () =>
      될때까지(this.driver, async () => !(await 보이나(this.driver, 시작화면.로그인버튼)) && (await 보이나(this.driver, 더알아보기시트.글들)), 시간),
    );
  }

  static 글순서(순서: number): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().className("android.widget.TextView").instance(${순서}))`;
  }

  async 글읽기(시간 = 10_000): Promise<string[]> {
    return 움직이는화면에서(this.driver, async () => {
      let 앞 = '';
      let 지금: string[] = [];
      await 될때까지(
        this.driver,
        async () => {
          const 읽은: string[] = [];
          for (let 순서 = 0; 순서 < 10; 순서++) {
            const 글칸 = this.driver.$(더알아보기시트.글순서(순서));
            if (!(await 글칸.isExisting())) break;
            읽은.push(await 글칸.getText());
          }
          const 같다 = 읽은.length > 0 && 읽은.join('\n') === 앞;
          앞 = 읽은.join('\n');
          지금 = 읽은;
          return 같다;
        },
        시간,
      );
      return 지금;
    });
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }
}
