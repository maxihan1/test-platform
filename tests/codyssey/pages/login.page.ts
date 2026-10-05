import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  readonly 제목: Locator;
  readonly 지역문구: Locator;
  readonly 다른지역버튼: Locator;
  readonly 비밀번호보기버튼: Locator;
  readonly 비밀번호숨기기버튼: Locator;
  readonly 회원가입버튼: Locator;
  readonly 비밀번호찾기링크: Locator;
  readonly 실패문구: Locator;
  readonly 지역선택팝업제목: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '로그인', level: 2 });
    this.지역문구 = page.getByText('서울 계정으로 로그인');
    this.다른지역버튼 = page.getByRole('button', { name: '다른 지역이신가요?' });
    this.비밀번호보기버튼 = page.getByRole('button', { name: '비밀번호 보기' });
    this.비밀번호숨기기버튼 = page.getByRole('button', { name: '비밀번호 숨기기' });
    this.회원가입버튼 = page.getByRole('button', { name: '회원가입', exact: true });
    this.비밀번호찾기링크 = page.getByRole('link', { name: '비밀번호 찾기' });
    this.실패문구 = page.getByText('입력하신 아이디 혹은 비밀번호가 일치하지 않습니다.');
    this.지역선택팝업제목 = page.getByRole('dialog').getByRole('heading', { name: '지역을 선택해 주세요' });
  }

  지역링크(이름: string): Locator {
    return this.page.getByRole('link', { name: 이름, exact: true });
  }
}
