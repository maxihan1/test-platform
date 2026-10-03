import type { Locator, Page } from '@playwright/test';

export class 회원가입팝업 {
  private readonly page: Page;
  readonly 창: Locator;
  readonly 지역선택제목: Locator;
  readonly 지역안내: Locator;
  readonly 다음버튼: Locator;
  readonly 약관제목: Locator;
  readonly 이용약관체크: Locator;
  readonly 개인정보체크: Locator;
  readonly 응시자격체크: Locator;
  readonly 본인인증버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    this.창 = page.getByRole('dialog');
    this.지역선택제목 = this.창.getByRole('heading', { name: '지역을 선택해 주세요' });
    this.지역안내 = this.창.getByText('계정은 지역별로 분리되어 있어, 가입 후에는 다른 지역으로 옮길 수 없습니다.');
    this.다음버튼 = this.창.getByRole('button', { name: '다음', exact: true });
    this.약관제목 = this.창.getByRole('heading', { name: '약관 동의 및 응시자격 확인' });
    this.이용약관체크 = this.창.getByLabel('코디세이 이용 약관에 동의합니다.');
    this.개인정보체크 = this.창.getByLabel('개인정보의 수집·이용 및 제3자 제공에 동의합니다.');
    this.응시자격체크 = this.창.getByLabel('응시자격을 확인하였습니다.');
    this.본인인증버튼 = this.창.getByRole('button', { name: '본인인증 하기' });
  }

  지역버튼(이름: string): Locator {
    return this.창.getByRole('button', { name: 이름 });
  }

  async 지역팝업열기(): Promise<void> {
    await this.page.goto('/loginForm?modal=signup-region');
  }

  async 지역고르기(이름: string): Promise<void> {
    await this.지역버튼(이름).click();
  }

  async 다음누르기(): Promise<void> {
    await this.다음버튼.click();
  }

  async 약관둘켜기(): Promise<void> {
    await this.이용약관체크.check();
    await this.개인정보체크.check();
  }

  async 약관모두켜기(): Promise<void> {
    await this.약관둘켜기();
    await this.응시자격체크.check();
  }
}
