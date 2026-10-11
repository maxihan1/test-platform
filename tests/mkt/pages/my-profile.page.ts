import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  static readonly 주소 = '/my/profile';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 재확인안내: Locator;
  readonly 재확인칸: Locator;
  readonly 비밀번호확인버튼: Locator;
  readonly 사진미리보기: Locator;
  readonly 올린사진미리보기: Locator;
  readonly 사진파일칸: Locator;
  readonly 기본이미지로버튼: Locator;
  readonly 사진오류: Locator;
  readonly 아이디칸: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 휴대폰칸: Locator;
  readonly 저장버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '회원정보 수정', level: 1 });
    this.재확인안내 = page.getByText('회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.');
    this.재확인칸 = page.getByLabel('비밀번호', { exact: true });
    this.비밀번호확인버튼 = page.getByRole('button', { name: '비밀번호 확인' });
    this.사진미리보기 = page.getByRole('img', { name: '프로필 사진 미리보기' });
    this.올린사진미리보기 = this.사진미리보기.and(page.locator('[src^="data:image/png"]'));
    this.사진파일칸 = page.getByLabel('프로필 사진', { exact: true });
    this.기본이미지로버튼 = page.getByRole('button', { name: '기본 이미지로' });
    this.사진오류 = page.locator('#avatar-error');
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.이름칸 = page.getByLabel('이름', { exact: true });
    this.이메일칸 = page.getByLabel('이메일', { exact: true });
    this.휴대폰칸 = page.getByLabel('휴대폰', { exact: true });
    this.저장버튼 = page.getByRole('button', { name: '저장', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원정보수정화면.주소);
    await this.비밀번호확인버튼.waitFor();
  }

  관심체크(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 비밀번호확인하기(비밀번호: string): Promise<void> {
    await this.재확인칸.fill(비밀번호);
    await this.비밀번호확인버튼.click();
    await this.저장버튼.waitFor();
  }

  async 사진올리기(사진: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.사진파일칸.setInputFiles(사진);
  }

  async 미리보기주소(): Promise<string> {
    return (await this.사진미리보기.getAttribute('src')) ?? '';
  }
}
