import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  constructor(private readonly page: Page) {}

  get 확인비밀번호칸(): Locator {
    return this.page.getByLabel(/^비밀번호( \*)?$/);
  }

  get 비밀번호확인버튼(): Locator {
    return this.page.getByRole('button', { name: '비밀번호 확인', exact: true });
  }

  get 저장버튼(): Locator {
    return this.page.getByRole('button', { name: '저장', exact: true });
  }

  get 아이디칸(): Locator {
    return this.page.getByLabel('아이디');
  }

  get 이름칸(): Locator {
    return this.page.getByLabel(/^이름( \*)?$/);
  }

  get 이메일칸(): Locator {
    return this.page.getByLabel(/^이메일( \*)?$/);
  }

  get 휴대폰칸(): Locator {
    return this.page.getByLabel('휴대폰');
  }

  get 관심분야묶음(): Locator {
    return this.page.getByRole('group', { name: '관심 분야' });
  }

  get 미리보기(): Locator {
    return this.page.getByAltText('프로필 사진 미리보기');
  }

  get 사진파일칸(): Locator {
    return this.page.getByLabel('프로필 사진', { exact: true });
  }

  get 기본이미지로버튼(): Locator {
    return this.page.getByRole('button', { name: '기본 이미지로' });
  }

  get 올린사진미리보기(): Locator {
    return this.미리보기.and(this.page.locator('[src^="data:image/jpeg"]'));
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/profile');
    await this.비밀번호확인버튼.waitFor();
  }

  async 비밀번호를확인한다(비밀번호: string): Promise<void> {
    await this.확인비밀번호칸.fill(비밀번호);
    await this.비밀번호확인버튼.click();
    await this.저장버튼.waitFor();
  }

  async 사진을올린다(이름: string, 종류: string, 내용: Buffer): Promise<void> {
    await this.사진파일칸.setInputFiles({ name: 이름, mimeType: 종류, buffer: 내용 });
  }

  async 미리보기주소(): Promise<string | null> {
    return this.미리보기.getAttribute('src');
  }
}
