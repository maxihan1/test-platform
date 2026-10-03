import type { Locator, Page } from '@playwright/test';

export class 회원정보수정화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/my/profile');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '회원정보 수정', level: 1, exact: true });
  }

  재확인안내(): Locator {
    return this.page.getByText('회원정보를 보호하기 위해 비밀번호를 다시 입력해 주세요.', { exact: true });
  }

  재확인비밀번호칸(): Locator {
    return this.page.getByLabel('비밀번호', { exact: true });
  }

  비밀번호확인버튼(): Locator {
    return this.page.getByRole('button', { name: '비밀번호 확인', exact: true });
  }

  아이디칸(): Locator {
    return this.page.getByLabel('아이디', { exact: true });
  }

  이름칸(): Locator {
    return this.page.getByLabel('이름', { exact: true });
  }

  이메일칸(): Locator {
    return this.page.getByLabel('이메일', { exact: true });
  }

  휴대폰칸(): Locator {
    return this.page.getByLabel('휴대폰', { exact: true });
  }

  관심분야체크(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  저장버튼(): Locator {
    return this.page.getByRole('button', { name: '저장', exact: true });
  }

  입력안내(문구: string): Locator {
    return this.page.getByRole('alert').getByText(문구, { exact: true });
  }

  async 관심분야고르기(이름: string): Promise<void> {
    await this.관심분야체크(이름).click();
  }

  async 휴대폰천천히적기(글: string): Promise<void> {
    await this.휴대폰칸().fill('');
    await this.휴대폰칸().pressSequentially(글);
  }

  async 비밀번호재확인하기(비밀번호: string): Promise<void> {
    await this.재확인비밀번호칸().fill(비밀번호);
    await this.비밀번호확인버튼().click();
  }
}
