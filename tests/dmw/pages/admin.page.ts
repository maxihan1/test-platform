import type { Download, Locator, Page } from '@playwright/test';

export class 관리자화면 {
  static readonly 주소 = '/admin';

  readonly 큰제목: Locator;
  readonly 회원탭: Locator;
  readonly 배너탭: Locator;
  readonly 설정탭: Locator;
  readonly 회원패널: Locator;
  readonly 배너패널: Locator;
  readonly 설정패널: Locator;
  readonly 검색칸: Locator;
  readonly 총인원: Locator;
  readonly 회원목록영역: Locator;
  readonly 회원표: Locator;
  readonly 검색결과없음: Locator;
  readonly 아이디들: Locator;
  readonly 위로버튼들: Locator;
  readonly 저장버튼: Locator;
  readonly 공지팝업스위치: Locator;
  readonly 내려받기링크: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '관리자' });
    this.회원탭 = page.getByRole('tab', { name: '회원 관리', exact: true });
    this.배너탭 = page.getByRole('tab', { name: '배너 관리', exact: true });
    this.설정탭 = page.getByRole('tab', { name: '설정 · 내보내기', exact: true });
    this.회원패널 = page.getByRole('tabpanel', { name: '회원 관리' });
    this.배너패널 = page.getByRole('tabpanel', { name: '배너 관리' });
    this.설정패널 = page.getByRole('tabpanel', { name: '설정 · 내보내기' });
    this.검색칸 = page.getByRole('searchbox', { name: '아이디 검색' });
    this.총인원 = page.getByText(/^총 \d+명$/);
    this.회원목록영역 = page.getByLabel('회원 목록', { exact: true });
    this.회원표 = this.회원목록영역.getByRole('table');
    this.검색결과없음 = this.회원목록영역.getByText('검색 결과가 없습니다', { exact: true });
    this.아이디들 = this.회원목록영역.locator('tr.u td:first-child');
    this.위로버튼들 = this.배너패널.getByRole('button', { name: / 위로$/ });
    this.저장버튼 = this.배너패널.getByRole('button', { name: '저장', exact: true });
    this.공지팝업스위치 = page.getByRole('switch', { name: '홈 공지 팝업' });
    this.내려받기링크 = page.getByRole('link', { name: '주문 내역 내려받기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(관리자화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.열제목('아이디').waitFor();
    await this.총인원.waitFor();
  }

  async 회원목록응답과함께열기(): Promise<number> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/admin/users') && r.request().method() === 'GET');
    await this.page.goto(관리자화면.주소);
    const 몸 = (await (await 응답).json()) as { items: { loginId: string }[] };
    await this.그려질때까지();
    return 몸.items.length;
  }

  열제목(이름: string): Locator {
    return this.회원목록영역.getByRole('columnheader').getByRole('button', { name: 이름 });
  }

  async 열제목누르기(이름: string): Promise<void> {
    await this.열제목(이름).click();
  }

  async 정렬표시(이름: string): Promise<string | null> {
    return this.회원목록영역.getByRole('columnheader').filter({ has: this.열제목(이름) }).getAttribute('aria-sort');
  }

  async 보이는아이디들(): Promise<string[]> {
    return this.아이디들.allInnerTexts();
  }

  회원줄(아이디: string): Locator {
    return this.회원목록영역.getByRole('row').filter({ has: this.page.getByRole('cell', { name: 아이디, exact: true }) });
  }

  잠금해제버튼(아이디: string): Locator {
    return this.회원줄(아이디).getByRole('button', { name: '잠금 해제', exact: true });
  }

  async 잠금해제누르기(아이디: string): Promise<void> {
    await this.잠금해제버튼(아이디).dispatchEvent('click');
  }

  async 아이디검색(아이디: string): Promise<void> {
    await this.검색칸.fill(아이디);
    await this.회원줄(아이디).first().waitFor();
  }

  async 총인원숫자(): Promise<number> {
    const 글 = await this.총인원.innerText();
    return Number(글.replace(/[^\d]/g, ''));
  }

  async 탭누르기(탭: Locator): Promise<void> {
    await 탭.click();
  }

  async 배너제목들(): Promise<string[]> {
    return this.위로버튼들.evaluateAll((버튼들) => 버튼들.map((버튼) => (버튼.getAttribute('aria-label') ?? '').replace(/ 위로$/, '')));
  }

  배너줄(제목: string): Locator {
    return this.배너패널.getByRole('listitem').filter({ has: this.page.getByRole('button', { name: `${제목} 위로`, exact: true }) });
  }

  노출스위치(제목: string): Locator {
    return this.배너줄(제목).getByRole('switch', { name: '노출' });
  }

  배너아래로(제목: string): Locator {
    return this.배너패널.getByRole('button', { name: `${제목} 아래로`, exact: true });
  }

  async 배너끌어다놓기(끄는제목: string, 놓는제목: string): Promise<void> {
    await this.배너줄(끄는제목).dragTo(this.배너줄(놓는제목));
  }

  async 배너저장누르기(): Promise<void> {
    await this.저장버튼.click();
  }

  async 주문내역내려받기(): Promise<Download> {
    const 받기 = this.page.waitForEvent('download');
    await this.내려받기링크.click();
    return 받기;
  }

  async 내려받은글(받음: Download): Promise<string> {
    const 흐름 = await 받음.createReadStream();
    let 글 = '';
    for await (const 조각 of 흐름) 글 += String(조각);
    return 글;
  }
}
