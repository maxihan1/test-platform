import type { Locator, Page } from '@playwright/test';

import type { 올릴파일 } from '../components/files.component.js';

export class 회원정보수정화면 {
  readonly 제목: Locator;
  readonly 안내문구: Locator;
  readonly 재확인칸: Locator;
  readonly 재확인버튼: Locator;
  readonly 아이디칸: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 휴대폰칸: Locator;
  readonly 저장버튼: Locator;
  readonly 사진칸: Locator;
  readonly 미리보기: Locator;
  readonly 기본이미지버튼: Locator;
  readonly 관심분야묶음: Locator;
  readonly 재확인오류: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원정보 수정', level: 1 });
    this.안내문구 = page.getByText('회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.');
    this.재확인칸 = page.getByLabel('비밀번호', { exact: true });
    this.재확인버튼 = page.getByRole('button', { name: '비밀번호 확인', exact: true });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.이름칸 = page.getByLabel('이름', { exact: true });
    this.이메일칸 = page.getByLabel('이메일', { exact: true });
    this.휴대폰칸 = page.getByLabel('휴대폰', { exact: true });
    this.저장버튼 = page.getByRole('button', { name: '저장', exact: true });
    this.사진칸 = page.getByLabel('프로필 사진', { exact: true });
    this.미리보기 = page.getByRole('img', { name: '프로필 사진 미리보기' });
    this.기본이미지버튼 = page.getByRole('button', { name: '기본 이미지로', exact: true });
    this.관심분야묶음 = page.getByRole('group', { name: '관심 분야' });
    this.재확인오류 = page.locator('#verify-error');
  }

  관심분야(이름: string): Locator {
    return this.관심분야묶음.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/profile');
    await this.제목.waitFor();
    await this.재확인칸.waitFor();
  }

  async 재확인누르기(비밀번호: string): Promise<void> {
    await this.재확인칸.fill(비밀번호);
    await this.재확인버튼.click();
  }

  async 재확인하기(비밀번호: string): Promise<void> {
    await this.재확인칸.fill(비밀번호);
    await this.재확인버튼.click();
    await this.이름칸.waitFor();
  }

  async 사진올리기(파일: 올릴파일): Promise<void> {
    await this.사진칸.setInputFiles(파일);
  }

  async 배경색(칸: Locator): Promise<string> {
    return 칸.evaluate((el) => getComputedStyle(el).backgroundColor);
  }

  async 미리보기주소(): Promise<string> {
    return (await this.미리보기.getAttribute('src')) ?? '';
  }

  async 미리보기바뀌기기다리기(이전: string): Promise<void> {
    await this.page.waitForFunction(
      (옛) => document.querySelector('img.avatar')?.getAttribute('src') !== 옛,
      이전,
    );
  }
}
