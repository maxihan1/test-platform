import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 회원정보수정화면 {
  static readonly 주소 = '/my/profile';
  readonly 제목: Locator;
  readonly 비밀번호칸: Locator;
  readonly 비밀번호확인버튼: Locator;
  readonly 비밀번호오류: Locator;
  readonly 사진칸: Locator;
  readonly 미리보기: Locator;
  readonly 기본이미지버튼: Locator;
  readonly 사진오류: Locator;
  readonly 아이디칸: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 휴대폰칸: Locator;
  readonly 관심분야: Locator;
  readonly 저장버튼: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.제목 = page.getByRole('heading', { name: '회원정보 수정', level: 1 });
    this.비밀번호칸 = 본문.getByLabel('비밀번호', { exact: true });
    this.비밀번호확인버튼 = 본문.getByRole('button', { name: '비밀번호 확인', exact: true });
    this.비밀번호오류 = 본문.getByText('비밀번호가 올바르지 않습니다');
    this.사진칸 = 본문.getByLabel('프로필 사진', { exact: true });
    this.미리보기 = 본문.getByRole('img', { name: '프로필 사진 미리보기' });
    this.기본이미지버튼 = 본문.getByRole('button', { name: '기본 이미지로', exact: true });
    this.사진오류 = 본문.getByText(/^(jpg, png 파일만 올릴 수 있습니다|2MB 이하 파일만 올릴 수 있습니다)$/);
    this.아이디칸 = 본문.getByLabel('아이디', { exact: true });
    this.이름칸 = 본문.getByLabel('이름', { exact: true });
    this.이메일칸 = 본문.getByLabel('이메일', { exact: true });
    this.휴대폰칸 = 본문.getByLabel('휴대폰', { exact: true });
    this.관심분야 = 본문.getByRole('group', { name: '관심 분야' });
    this.저장버튼 = 본문.getByRole('button', { name: '저장', exact: true });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(회원정보수정화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.비밀번호확인버튼.waitFor();
  }

  async 비밀번호확인하기(비밀번호: string): Promise<void> {
    await this.비밀번호칸.fill(비밀번호);
    await this.비밀번호확인버튼.click();
    await this.이름칸.waitFor();
  }

  async 이름바꾸기(이름: string): Promise<void> {
    await this.이름칸.fill(이름);
  }

  async 저장하기(): Promise<void> {
    await this.저장버튼.click();
  }

  async 사진올리기(바이트: number): Promise<void> {
    await this.사진칸.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.alloc(바이트, 1) });
  }

  async 미리보기주소(): Promise<string> {
    return (await this.미리보기.getAttribute('src')) ?? '';
  }

  async 아이디칸흐린가(): Promise<boolean> {
    const 모양 = (칸: Locator) =>
      칸.evaluate((요소) => {
        const 값 = getComputedStyle(요소);
        return { 투명도: 값.opacity, 글자색: 값.color, 배경색: 값.backgroundColor };
      });
    const [아이디, 이름] = [await 모양(this.아이디칸), await 모양(this.이름칸)];
    return 아이디.투명도 !== '1' || 아이디.글자색 !== 이름.글자색 || 아이디.배경색 !== 이름.배경색;
  }

  async 미리보기바뀔때까지(옛주소: string): Promise<void> {
    await this.미리보기.evaluate(
      (요소, 옛) =>
        new Promise<void>((끝) => {
          const 보기 = () => {
            if ((요소 as HTMLImageElement).getAttribute('src') !== 옛) 끝();
            else requestAnimationFrame(보기);
          };
          보기();
        }),
      옛주소,
    );
  }
}
