import type { Locator, Page } from '@playwright/test';

export class 내정보화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 회원탈퇴버튼: Locator;
  readonly 홈으로버튼: Locator;
  readonly 비밀번호변경버튼: Locator;
  readonly 내정보변경버튼: Locator;
  readonly 성명칸: Locator;
  readonly 프로필도움말버튼: Locator;
  readonly 프로필도움말: Locator;
  readonly 비밀번호변경팝업: Locator;
  readonly 비밀번호변경팝업제목: Locator;
  readonly 비밀번호규칙: Locator;
  readonly 새비밀번호칸: Locator;
  readonly 비밀번호변경취소버튼: Locator;
  readonly 본인확인팝업: Locator;
  readonly 본인확인팝업제목: Locator;
  readonly 본인확인취소버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '내 정보', level: 1 });
    this.회원탈퇴버튼 = page.getByRole('button', { name: '회원탈퇴', exact: true });
    this.홈으로버튼 = page.getByRole('button', { name: '홈으로', exact: true });
    this.비밀번호변경버튼 = page.getByRole('button', { name: '비밀번호 변경', exact: true });
    this.내정보변경버튼 = page.getByRole('button', { name: '내정보 변경하기', exact: true });
    this.성명칸 = page.getByRole('textbox', { name: '성명' });
    this.프로필도움말버튼 = page.getByRole('button', { name: '?', exact: true });
    this.프로필도움말 = page.getByText('* 프로필 사진은 10mb 이하 jpg, png 형식만 등록 가능합니다.');

    this.비밀번호변경팝업 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '비밀번호 변경' }) });
    this.비밀번호변경팝업제목 = this.비밀번호변경팝업.getByRole('heading', { name: '비밀번호 변경' });
    this.비밀번호규칙 = this.비밀번호변경팝업.getByText('길이: 8자 이상 20자 이하');
    this.새비밀번호칸 = this.비밀번호변경팝업.getByRole('textbox', { name: '새 비밀번호', exact: true });
    this.비밀번호변경취소버튼 = this.비밀번호변경팝업.getByRole('button', { name: '취소하기' });

    this.본인확인팝업 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '본인 확인' }) });
    this.본인확인팝업제목 = this.본인확인팝업.getByRole('heading', { name: '본인 확인' });
    this.본인확인취소버튼 = this.본인확인팝업.getByRole('button', { name: '취소', exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/myinfo/ams/list');
  }

  async 하단버튼들이보이는지(): Promise<boolean> {
    const 보임 = await Promise.all(
      [this.회원탈퇴버튼, this.홈으로버튼, this.비밀번호변경버튼, this.내정보변경버튼].map((버튼) => 버튼.isVisible()),
    );
    return 보임.every(Boolean);
  }

  async 프로필도움말을연다(): Promise<void> {
    await this.프로필도움말버튼.click();
  }

  async 비밀번호변경팝업을연다(): Promise<void> {
    await this.비밀번호변경버튼.click();
  }

  async 본인확인팝업을연다(): Promise<void> {
    await this.내정보변경버튼.click();
  }
}
