import type { Locator, Page } from '@playwright/test';

import { 제목 } from '../components/title.component.js';

export class 비밀번호찾기화면 {
  constructor(private readonly page: Page) {}

  async 연다(): Promise<void> {
    await this.page.goto('/pwd/PwdSch');
  }

  get 제목(): Locator {
    return new 제목(this.page).중제목('비밀번호 재설정');
  }

  get 안내문구(): Locator {
    return this.page.getByText('비밀번호는 가입하신 메일을 통해 초기화가 가능합니다.', { exact: true });
  }

  get 이름칸(): Locator {
    return this.page.getByPlaceholder('이름 입력', { exact: true });
  }

  get 이메일칸(): Locator {
    return this.page.getByPlaceholder('이메일 입력', { exact: true });
  }

  get 인증메일발송버튼(): Locator {
    return this.page.getByRole('button', { name: '인증 메일 발송', exact: true });
  }

  get 취소링크(): Locator {
    return this.page.getByRole('link', { name: '취소하기', exact: true });
  }
}
