import type { Locator, Page } from '@playwright/test';

export interface 목록행 {
  번호: string;
  분류: string;
  제목: string;
  작성자: string;
  작성일: string;
  조회수: string;
  좋아요: string;
}

export class 게시판목록화면 {
  static readonly 주소 = '/board';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 탭들: Locator;
  readonly 검색조건: Locator;
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;
  readonly 정렬: Locator;
  readonly 글쓰기링크: Locator;
  readonly 표: Locator;
  readonly 표머리칸들: Locator;
  readonly 표본행들: Locator;
  readonly 공지행들: Locator;
  readonly 일반행들: Locator;
  readonly 빈상태: Locator;
  readonly 오류안내: Locator;
  readonly 페이저: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 쪽번호들: Locator;
  readonly 현재쪽: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '커뮤니티', level: 1 });
    this.탭들 = page.getByRole('tablist', { name: '분류' }).getByRole('tab');
    this.검색조건 = page.getByRole('combobox', { name: '검색 조건' });
    this.검색어칸 = page.getByRole('searchbox', { name: '검색어' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.정렬 = page.getByRole('combobox', { name: '정렬' });
    this.글쓰기링크 = page.getByRole('link', { name: '글쓰기', exact: true });
    this.표 = page.locator('#board').getByRole('table');
    this.표머리칸들 = this.표.getByRole('columnheader');
    this.표본행들 = page.locator('#board tbody tr:not(.skel-row)');
    this.공지행들 = page.locator('#board tbody tr.notice');
    this.일반행들 = page.locator('#board tbody tr:not(.notice):not(.skel-row)');
    this.빈상태 = page.getByText('검색 결과가 없습니다', { exact: true });
    this.오류안내 = page.locator('#board p.empty-state');
    this.페이저 = page.getByRole('navigation', { name: '페이지' });
    this.이전 = this.페이저.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.페이저.getByRole('button', { name: '다음', exact: true });
    this.쪽번호들 = this.페이저.getByRole('button', { name: /^\d+$/ });
    this.현재쪽 = this.페이저.locator('[aria-current="page"]');
  }

  탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  선택된탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  행(제목: string): Locator {
    return this.일반행들.filter({ has: this.page.getByRole('link', { name: 제목, exact: true }) });
  }

  쪽(번호: number): Locator {
    return this.페이저.getByRole('button', { name: String(번호), exact: true });
  }

  async 열기(주소: string = 게시판목록화면.주소): Promise<void> {
    await this.page.goto(주소);
    await this.불러오기기다리기();
  }

  async 불러오기기다리기(): Promise<void> {
    await this.표본행들.or(this.빈상태).or(this.오류안내).first().waitFor();
  }

  async 탭누르기(이름: string): Promise<void> {
    await this.탭(이름).click();
    await this.불러오기기다리기();
  }

  async 쪽누르기(번호: number): Promise<void> {
    await this.쪽(번호).click();
    await this.불러오기기다리기();
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬.selectOption({ label: 이름 });
    await this.불러오기기다리기();
  }

  async 검색어넣고누르기(검색어: string, 조건?: string): Promise<void> {
    if (조건 !== undefined) await this.검색조건.selectOption({ label: 조건 });
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }

  async 검색하기(검색어: string, 조건?: string): Promise<void> {
    await this.검색어넣고누르기(검색어, 조건);
    await this.불러오기기다리기();
  }

  async 마지막쪽번호(): Promise<number> {
    const 글들 = await this.쪽번호들.allInnerTexts();
    return Number(글들[글들.length - 1]);
  }

  async 행읽기(행: Locator): Promise<목록행> {
    const 칸들 = await 행.getByRole('cell').allInnerTexts();
    return {
      번호: 칸들[0] ?? '',
      분류: 칸들[1] ?? '',
      제목: await 행.getByRole('link').innerText(),
      작성자: 칸들[3] ?? '',
      작성일: 칸들[4] ?? '',
      조회수: 칸들[5] ?? '',
      좋아요: 칸들[6] ?? '',
    };
  }

  async 일반행읽기(): Promise<목록행[]> {
    return this.일반행들.evaluateAll((행들) =>
      행들.map((행) => {
        const 칸들 = Array.from(행.querySelectorAll('td')).map((칸) => 칸.textContent ?? '');
        return {
          번호: 칸들[0] ?? '',
          분류: 칸들[1] ?? '',
          제목: 행.querySelector('a')?.textContent ?? '',
          작성자: 칸들[3] ?? '',
          작성일: 칸들[4] ?? '',
          조회수: 칸들[5] ?? '',
          좋아요: 칸들[6] ?? '',
        };
      }),
    );
  }

  async 제목들읽기(): Promise<string[]> {
    return this.표.getByRole('link').allInnerTexts();
  }

  댓글수표시(행: Locator): Locator {
    return 행.getByText(/^\[\d+\]$/);
  }

  async 첫행공지표시(): Promise<string> {
    return (await this.표본행들.first().locator('.notice-mark').allInnerTexts()).join('');
  }

  async 일반행첫링크주소(): Promise<string | null> {
    return this.일반행들.first().getByRole('link').getAttribute('href');
  }

  async 보이는오류안내(): Promise<string> {
    return this.오류안내.innerText();
  }
}
