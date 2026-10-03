import type { Locator, Page } from '@playwright/test';

export class 회원가입창 {
  constructor(private readonly page: Page) {}

  get 창(): Locator {
    return this.page.getByRole('dialog');
  }

  제목(이름: string): Locator {
    return this.창.getByRole('heading', { level: 2, name: 이름, exact: true });
  }

  소제목(이름: string): Locator {
    return this.창.getByRole('heading', { level: 3, name: 이름, exact: true });
  }

  안내문구(글자: string): Locator {
    return this.창.getByText(글자, { exact: true });
  }

  지역버튼(이름: string): Locator {
    return this.창.getByRole('button', { name: 이름 });
  }

  버튼(이름: string): Locator {
    return this.창.getByRole('button', { name: 이름, exact: true });
  }

  체크박스(이름: string): Locator {
    return this.창.getByRole('checkbox', { name: 이름, exact: true });
  }

  단계(이름: string): Locator {
    return this.창.getByRole('listitem').filter({ hasText: 이름 });
  }

  규칙줄(글자: string): Locator {
    return this.창.getByRole('listitem').filter({ hasText: 글자 });
  }

  get 비밀번호규칙(): Locator {
    return this.창.getByRole('listitem').filter({ hasText: /[○✓]/ });
  }

  get 이름칸(): Locator {
    return this.창.getByRole('textbox', { name: '이름 (필수)', exact: true });
  }

  get 비밀번호칸(): Locator {
    return this.창.getByRole('textbox', { name: '비밀번호 입력', exact: true });
  }

  async 지역을고른다(이름: string): Promise<void> {
    await this.지역버튼(이름).click();
  }

  async 다음을누른다(): Promise<void> {
    await this.버튼('다음').click();
  }

  async 약관셋을켠다(): Promise<void> {
    await this.체크박스('코디세이 이용 약관에 동의합니다.').check();
    await this.체크박스('개인정보의 수집·이용 및 제3자 제공에 동의합니다.').check();
    await this.체크박스('응시자격을 확인하였습니다.').check();
  }

  async 비밀번호를적는다(글자: string): Promise<void> {
    await this.비밀번호칸.fill(글자);
  }

  async 보이는지역버튼(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.지역버튼(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 보이는체크박스(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.체크박스(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 보이는단계(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.단계(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }
}
