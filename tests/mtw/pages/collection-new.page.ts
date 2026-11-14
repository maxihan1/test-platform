import type { Locator, Page } from '@playwright/test';

export class 컬렉션만들기화면 {
  static readonly 주소 = '/collections/new';

  readonly 제목: Locator;
  readonly 단계표시: Locator;
  readonly 검색칸: Locator;
  readonly 계속: Locator;
  readonly 계정수: Locator;
  readonly 이름칸: Locator;
  readonly 기본정보: Locator;
  readonly 추가불가: Locator;
  readonly 한도안내: Locator;
  readonly 최대안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '새 컬렉션', level: 1 });
    this.단계표시 = page.getByRole('main').getByText(/^\d\/2 단계$/);
    this.검색칸 = page.getByRole('main').getByRole('combobox', { name: '추가할 계정 검색' });
    this.계속 = page.getByRole('main').getByRole('button', { name: '계속' });
    this.계정수 = page.getByRole('main').getByRole('heading', { name: /^계정 \d+\/25개$/ });
    this.이름칸 = page.getByRole('main').getByRole('textbox', { name: '이름' });
    this.기본정보 = page.getByRole('main').getByRole('heading', { name: '기본 정보' });
    this.추가불가 = page.getByRole('listbox').getByRole('heading', { name: '추가할 수 없음' });
    this.한도안내 = page.getByRole('heading', { name: '컬렉션의 최대 개수에 도달하였습니다' });
    this.최대안내 = page.getByText('/25개');
  }

  async 열기(): Promise<void> {
    await this.page.goto(컬렉션만들기화면.주소);
    await this.검색칸.or(this.한도안내).waitFor();
  }

  async 계정검색(검색어: string): Promise<void> {
    await this.검색칸.fill(검색어);
  }

  결과(아이디: string): Locator {
    return this.page.getByRole('option', { name: new RegExp(`@${아이디}@`) });
  }

  async 계정더하기(아이디: string): Promise<void> {
    await this.계정검색(아이디);
    await this.결과(아이디).click();
    await this.계정수.waitFor();
  }
}
