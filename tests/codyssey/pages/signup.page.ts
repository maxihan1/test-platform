import type { Locator, Page } from '@playwright/test';

export class 회원가입팝업 {
  readonly page: Page;
  readonly 지역팝업: Locator;
  readonly 지역팝업제목: Locator;
  readonly 지역팝업닫기버튼: Locator;
  readonly 서울버튼: Locator;
  readonly 대전버튼: Locator;
  readonly 경남버튼: Locator;
  readonly 지역안내문: Locator;
  readonly 지역선택버튼: Locator;
  readonly 지역다음버튼: Locator;
  readonly 약관팝업: Locator;
  readonly 약관팝업제목: Locator;
  readonly 약관이전버튼: Locator;
  readonly 이용약관동의칸: Locator;
  readonly 개인정보동의칸: Locator;
  readonly 응시자격확인칸: Locator;
  readonly 약관다음버튼: Locator;
  readonly 기본정보팝업: Locator;
  readonly 기본정보팝업제목: Locator;
  readonly 기본정보이전버튼: Locator;
  readonly 본인인증버튼: Locator;
  readonly 휴대전화칸: Locator;
  readonly 비밀번호칸: Locator;

  constructor(page: Page) {
    this.page = page;
    this.지역팝업 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '지역을 선택해 주세요' }) });
    this.지역팝업제목 = this.지역팝업.getByRole('heading', { name: '지역을 선택해 주세요' });
    this.지역팝업닫기버튼 = this.지역팝업.getByRole('button', { name: '닫기' });
    this.서울버튼 = this.지역팝업.getByRole('button', { name: '서울 개포 캠퍼스' });
    this.대전버튼 = this.지역팝업.getByRole('button', { name: '대전 대전 캠퍼스' });
    this.경남버튼 = this.지역팝업.getByRole('button', { name: '경남 경남 캠퍼스' });
    this.지역안내문 = this.지역팝업.getByText('계정은 지역별로 분리되어 있어, 가입 후에는 다른 지역으로 옮길 수 없습니다.');
    this.지역선택버튼 = this.지역팝업.getByRole('button', { name: '지역을 선택해 주세요' });
    this.지역다음버튼 = this.지역팝업.getByRole('button', { name: '다음', exact: true });

    this.약관팝업 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '약관 동의 및 응시자격 확인' }) });
    this.약관팝업제목 = this.약관팝업.getByRole('heading', { name: '약관 동의 및 응시자격 확인' });
    this.약관이전버튼 = this.약관팝업.getByRole('button', { name: '이전', exact: true });
    this.이용약관동의칸 = this.약관팝업.getByRole('checkbox', { name: '코디세이 이용 약관에 동의합니다.' });
    this.개인정보동의칸 = this.약관팝업.getByRole('checkbox', { name: '개인정보의 수집·이용 및 제3자 제공에 동의합니다.' });
    this.응시자격확인칸 = this.약관팝업.getByRole('checkbox', { name: '응시자격을 확인하였습니다.' });
    this.약관다음버튼 = this.약관팝업.getByRole('button', { name: '다음', exact: true });

    this.기본정보팝업 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '회원가입', exact: true }) });
    this.기본정보팝업제목 = this.기본정보팝업.getByRole('heading', { name: '회원가입', exact: true });
    this.기본정보이전버튼 = this.기본정보팝업.getByRole('button', { name: '이전', exact: true });
    this.본인인증버튼 = this.기본정보팝업.getByRole('button', { name: '본인인증 하기' });
    this.휴대전화칸 = this.기본정보팝업.getByRole('textbox', { name: '휴대전화' });
    this.비밀번호칸 = this.기본정보팝업.getByPlaceholder('비밀번호 입력', { exact: true });
  }

  async 지역팝업을연다(): Promise<void> {
    await this.page.goto('/loginForm?modal=signup-region');
  }

  async 서울개포를고른다(): Promise<void> {
    await this.서울버튼.click();
  }

  async 지역다음을누른다(): Promise<void> {
    await this.지역다음버튼.click();
  }

  async 약관팝업을연다(): Promise<void> {
    await this.지역팝업을연다();
    await this.서울개포를고른다();
    await this.지역다음을누른다();
  }

  async 약관세칸을모두켠다(): Promise<void> {
    await this.이용약관동의칸.check();
    await this.개인정보동의칸.check();
    await this.응시자격확인칸.check();
  }

  async 약관다음을누른다(): Promise<void> {
    await this.약관다음버튼.click();
  }

  async 기본정보단계를연다(): Promise<void> {
    await this.약관팝업을연다();
    await this.약관세칸을모두켠다();
    await this.약관다음을누른다();
  }
}
