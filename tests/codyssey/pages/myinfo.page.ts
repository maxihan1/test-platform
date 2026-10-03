import type { Locator, Page } from '@playwright/test';

export class 내정보화면 {
  readonly 제목: Locator;
  readonly 비밀번호변경버튼: Locator;
  readonly 내정보변경하기버튼: Locator;
  readonly 회원탈퇴버튼: Locator;
  readonly 홈으로버튼: Locator;
  readonly 성명칸: Locator;
  readonly 이메일칸: Locator;
  readonly 사진도움말버튼: Locator;
  readonly 사진안내문구: Locator;
  readonly 비밀번호변경창제목: Locator;
  readonly 새비밀번호칸: Locator;
  readonly 새비밀번호재입력칸: Locator;
  readonly 비밀번호변경취소버튼: Locator;
  readonly 본인확인창제목: Locator;
  readonly 탈퇴계속버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '내 정보', level: 1 });
    this.비밀번호변경버튼 = page.getByRole('button', { name: '비밀번호 변경', exact: true });
    this.내정보변경하기버튼 = page.getByRole('button', { name: '내정보 변경하기', exact: true });
    this.회원탈퇴버튼 = page.getByRole('button', { name: '회원탈퇴', exact: true });
    this.홈으로버튼 = page.getByRole('button', { name: '홈으로', exact: true });
    this.성명칸 = page.getByLabel('성명 (필수)');
    this.이메일칸 = page.getByLabel('이메일 (필수)');
    this.사진도움말버튼 = page.getByRole('button', { name: '?', exact: true });
    this.사진안내문구 = page.getByText('* 프로필 사진은 10mb 이하 jpg, png 형식만 등록 가능합니다.');
    this.비밀번호변경창제목 = page.getByRole('heading', { name: '비밀번호 변경', level: 2 });
    this.새비밀번호칸 = page.getByRole('dialog').getByLabel('새 비밀번호', { exact: true });
    this.새비밀번호재입력칸 = page.getByRole('dialog').getByLabel('새 비밀번호 재입력', { exact: true });
    this.비밀번호변경취소버튼 = page.getByRole('dialog').getByRole('button', { name: '취소하기', exact: true });
    this.본인확인창제목 = page.getByRole('heading', { name: '본인 확인', level: 2 });
    this.탈퇴계속버튼 = page.getByRole('dialog').getByRole('button', { name: '계속', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/myinfo/ams/list');
  }

  async 사진도움말누르기(): Promise<void> {
    await this.사진도움말버튼.click();
  }

  async 비밀번호변경누르기(): Promise<void> {
    await this.비밀번호변경버튼.click();
  }

  async 내정보변경하기누르기(): Promise<void> {
    await this.내정보변경하기버튼.click();
  }

  async 회원탈퇴누르기(): Promise<void> {
    await this.회원탈퇴버튼.click();
  }

  async 홈으로누르기(): Promise<void> {
    await this.홈으로버튼.click();
  }

  async 비밀번호변경취소하기(): Promise<void> {
    await this.비밀번호변경취소버튼.click();
  }
}
