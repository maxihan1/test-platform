import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';

export class 뜨는메뉴 {
  constructor(private readonly driver: AppDriver) {}

  항목(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  항목포함(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").textContains(${JSON.stringify(글자)})`;
  }

  async 보이나(글자: string): Promise<boolean> {
    return 보이나(this.driver, this.항목(글자));
  }

  async 뜰때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.항목(글자), 시간);
  }

  async 고르기(글자: string): Promise<void> {
    await 뜰때까지(this.driver, this.항목(글자));
    await this.driver.$(this.항목(글자)).click();
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }
}
