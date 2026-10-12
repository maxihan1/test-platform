import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  static readonly 주소 = '/my/profile';

  readonly 제목: Locator;
  readonly 비밀번호: Locator;
  readonly 비밀번호확인: Locator;
  readonly 비밀번호오류: Locator;
  readonly 프로필사진: Locator;
  readonly 미리보기: Locator;
  readonly 새사진미리보기: Locator;
  readonly 새jpg미리보기: Locator;
  readonly 기본이미지로: Locator;
  readonly 사진안내: Locator;
  readonly 사진오류: Locator;
  readonly 아이디: Locator;
  readonly 이름: Locator;
  readonly 이메일: Locator;
  readonly 휴대폰: Locator;
  readonly 관심분야들: Locator;
  readonly 저장: Locator;
  readonly 수정오류: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원정보 수정', level: 1 });
    this.비밀번호 = page.getByLabel('비밀번호', { exact: true });
    this.비밀번호확인 = page.getByRole('button', { name: '비밀번호 확인', exact: true });
    this.비밀번호오류 = page.locator('#verify-error');
    this.프로필사진 = page.getByLabel('프로필 사진', { exact: true });
    this.미리보기 = page.getByRole('img', { name: '프로필 사진 미리보기' });
    this.새사진미리보기 = this.미리보기.and(page.locator('[src^="data:image/png"]'));
    this.새jpg미리보기 = this.미리보기.and(page.locator('[src^="data:image/jpeg"]'));
    this.기본이미지로 = page.getByRole('button', { name: '기본 이미지로', exact: true });
    this.사진안내 = page.getByText('jpg, png · 2MB 이하', { exact: true });
    this.사진오류 = page.locator('#avatar-error');
    this.아이디 = page.getByLabel('아이디', { exact: true });
    this.이름 = page.getByLabel('이름', { exact: true });
    this.이메일 = page.getByLabel('이메일', { exact: true });
    this.휴대폰 = page.getByLabel('휴대폰', { exact: true });
    this.관심분야들 = page.getByRole('group', { name: '관심 분야' }).getByRole('checkbox');
    this.저장 = page.getByRole('button', { name: '저장', exact: true });
    this.수정오류 = page.locator('#edit-error');
  }

  관심분야(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원정보수정화면.주소);
    await this.제목.waitFor();
  }

  async 비밀번호확인하기(비밀번호: string): Promise<void> {
    await this.비밀번호.fill(비밀번호);
    await this.비밀번호확인.click();
    await this.이름.waitFor();
  }

  async 미리보기주소(): Promise<string> {
    return (await this.미리보기.getAttribute('src')) ?? '';
  }

  async 사진고르기(파일: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.프로필사진.setInputFiles(파일);
  }
}
