import type { Locator, Page } from '@playwright/test';

import { 창 } from '../components/modal.component.js';
import { 운영틀 } from '../components/ops-shell.component.js';
import { 토스트 } from '../components/toast.component.js';

export class 유저화면 {
  static readonly 주소 = '/users';

  readonly 틀: 운영틀;
  readonly 알림: 토스트;
  readonly 창: 창;
  readonly 제목: Locator;
  readonly 준비표시: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.알림 = new 토스트(page);
    this.창 = new 창(page);
    this.제목 = this.틀.본문.getByRole('heading', { level: 1, name: '유저 · 제재', exact: true });
    this.준비표시 = page.locator('#user-total').filter({ hasText: /\S/ });
  }

  async 열기(뒤?: string): Promise<void> {
    await this.page.goto(뒤 === undefined ? 유저화면.주소 : `${유저화면.주소}${뒤}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.준비표시.waitFor();
  }

  get 상세패널(): Locator {
    return this.page.locator('#user-detail');
  }

  유저줄(아이디: string): Locator {
    return this.page.locator('#user-table tbody tr').filter({ has: this.page.getByRole('button', { name: 아이디, exact: true }) });
  }

  줄버튼(아이디: string, 이름: string): Locator {
    return this.유저줄(아이디).getByRole('button', { name: 이름, exact: true });
  }

  async 상세열기(계정: number): Promise<void> {
    await this.열기(`?id=${String(계정)}`);
    await this.상세패널.getByRole('heading', { level: 2 }).waitFor();
  }

  캐릭터지급링크(캐릭터이름: string): Locator {
    return this.상세패널.locator('tbody tr').filter({ hasText: 캐릭터이름 }).getByRole('link', { name: '지급', exact: true });
  }

  get 검색칸(): Locator {
    return this.page.getByLabel('검색', { exact: true });
  }

  get 안내검색칸(): Locator {
    return this.page.getByPlaceholder('아이디 · 이메일 · 계정 번호 · 캐릭터 이름', { exact: true });
  }

  get 총인원(): Locator {
    return this.page.getByText(/^총 [\d,]+명$/);
  }

  get 표영역(): Locator {
    return this.page.locator('#user-table');
  }

  get 유저표(): Locator {
    return this.표영역.getByRole('table');
  }

  get 유저표머리(): Locator {
    return this.유저표.getByRole('columnheader');
  }

  get 유저줄들(): Locator {
    return this.유저표.locator('tbody').getByRole('row');
  }

  get 번호칸들(): Locator {
    return this.유저줄들.locator('td:nth-child(1)');
  }

  get 아이디칸들(): Locator {
    return this.유저줄들.locator('td:nth-child(2)');
  }

  get 이메일칸들(): Locator {
    return this.유저줄들.locator('td:nth-child(3)');
  }

  get 없음안내(): Locator {
    return this.표영역.getByText('조건에 맞는 유저가 없습니다', { exact: true });
  }

  이메일칸(아이디: string): Locator {
    return this.유저줄(아이디).locator('td:nth-child(3)');
  }

  아이디링크(아이디: string): Locator {
    return this.표영역.getByRole('button', { name: 아이디, exact: true });
  }

  상태칩들(아이디: string): Locator {
    return this.유저줄(아이디).locator('.status');
  }

  async 검색(글: string): Promise<void> {
    const 보낸글 = 글.trim();
    const 응답 = this.page.waitForResponse((r) => {
      const 주소 = new URL(r.url());
      return 주소.pathname === '/api/ops/users' && 주소.searchParams.get('q') === 보낸글;
    });
    await this.검색칸.fill(글);
    const 몸 = (await (await 응답).json()) as { items: { id: number }[] };
    await this.page.waitForFunction(
      ([개수, 첫번호]) => {
        const 줄들 = document.querySelectorAll('#user-table tbody tr');
        return 줄들.length === 개수 && (개수 === 0 || 줄들[0]?.querySelector('td')?.textContent === String(첫번호));
      },
      [몸.items.length, 몸.items[0]?.id ?? 0] as const,
    );
  }

  async 새로고침(): Promise<void> {
    await this.page.reload();
    await this.그려질때까지();
  }

  async 열이름(표: Locator): Promise<string> {
    const 이름들 = await 표.getByRole('columnheader').allInnerTexts();
    return 이름들.map((x) => x.trim()).filter((x) => x !== '').join(', ');
  }

  async 잘렸나(칸: Locator): Promise<boolean> {
    return 칸.evaluate((el) => el.scrollWidth > el.clientWidth);
  }

  async 시각표기(밀리초: number): Promise<string> {
    return this.page.evaluate((값) => {
      const 두자리 = (n: number): string => String(n).padStart(2, '0');
      const d = new Date(값);
      return `${String(d.getFullYear())}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())} ${두자리(d.getHours())}:${두자리(d.getMinutes())}`;
    }, 밀리초);
  }

  async 없는유저열기(번호: number): Promise<void> {
    await this.page.goto(`${유저화면.주소}?id=${String(번호)}`);
    await this.틀.그려질때까지();
  }

  async 상세닫힘기다리기(): Promise<void> {
    await this.page.waitForFunction(() => document.querySelector('#user-detail')?.hasAttribute('hidden') === true);
  }

  async 상세열림기다리기(): Promise<void> {
    await this.page.waitForFunction(() => document.querySelector('#user-detail')?.hasAttribute('hidden') === false);
  }

  get 상세제목(): Locator {
    return this.상세패널.getByRole('heading', { level: 2 });
  }

  get 상세닫기(): Locator {
    return this.상세패널.getByRole('button', { name: '닫기', exact: true });
  }

  get 상세머리칩들(): Locator {
    return this.상세패널.locator('.ops-bar:has(h2) .status');
  }

  get 상세소제목들(): Locator {
    return this.상세패널.getByRole('heading', { level: 3 });
  }

  get 캐릭터표(): Locator {
    return this.상세패널.getByRole('table').filter({ has: this.page.getByRole('columnheader', { name: '소지 아이템', exact: true }) });
  }

  get 제재표(): Locator {
    return this.상세패널.getByRole('table').filter({ has: this.page.getByRole('columnheader', { name: '사유', exact: true }) });
  }

  get 캐릭터없음안내(): Locator {
    return this.상세패널.getByText('캐릭터가 없습니다', { exact: true });
  }

  get 제재없음안내(): Locator {
    return this.상세패널.getByText('제재 이력이 없습니다', { exact: true });
  }

  캐릭터칸(캐릭터이름: string, 열: '번호' | '이름' | '레벨' | '직업' | '종족' | '위치' | '재화' | '소지 아이템' | '마지막 저장'): Locator {
    const 자리 = ['번호', '이름', '레벨', '직업', '종족', '위치', '재화', '소지 아이템', '마지막 저장'].indexOf(열) + 1;
    const 줄 = this.캐릭터표.locator('tbody tr').filter({ has: this.page.getByRole('cell', { name: 캐릭터이름, exact: true }) });
    return 줄.locator(`td:nth-child(${String(자리)})`);
  }

  제재행(사유: string): Locator {
    return this.제재표.locator('tbody tr').filter({ hasText: 사유 });
  }

  제재종류칩(사유: string): Locator {
    return this.제재행(사유).locator('td:nth-child(1) .status');
  }

  get 제재사유칸들(): Locator {
    return this.제재표.locator('tbody tr td:nth-child(2)');
  }

  제재시작칸(사유: string): Locator {
    return this.제재행(사유).locator('td:nth-child(3)');
  }

  제재끝칸(사유: string): Locator {
    return this.제재행(사유).locator('td:nth-child(4)');
  }

  제재상태칩(사유: string): Locator {
    return this.제재행(사유).locator('td:nth-child(5) .status');
  }

  제재상태작은글(사유: string): Locator {
    return this.제재행(사유).locator('td:nth-child(5) .mini');
  }

  제재행해제버튼(사유: string): Locator {
    return this.제재행(사유).getByRole('button', { name: '해제', exact: true });
  }

  get 기간칸(): Locator {
    return this.창.칸('기간');
  }

  get 제재사유칸(): Locator {
    return this.창.칸('사유 (1~200자, 유저에게 보일 수 있음)');
  }

  get 해제사유칸(): Locator {
    return this.창.칸('해제 사유 (1~200자)');
  }

  get 기간선택지(): Locator {
    return this.기간칸.getByRole('option');
  }

  async 선택된기간(): Promise<string> {
    return this.기간칸.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }

  창안내(글: string): Locator {
    return this.창.상자.getByText(글, { exact: true });
  }

  async 제재창열기(아이디: string, 버튼이름: '정지' | '채팅 금지' | '정지 해제' | '채팅 금지 해제'): Promise<void> {
    await this.줄버튼(아이디, 버튼이름).click();
    await this.창.상자.waitFor();
  }

  async 제재걸기(아이디: string, 버튼이름: '정지' | '채팅 금지', 사유: string, 기간?: string): Promise<void> {
    await this.제재창열기(아이디, 버튼이름);
    if (기간 !== undefined) await this.기간칸.selectOption({ label: 기간 });
    await this.제재사유칸.fill(사유);
    await this.창.누르기(버튼이름);
  }

  async 해제하기(아이디: string, 버튼이름: '정지 해제' | '채팅 금지 해제', 사유: string): Promise<void> {
    await this.제재창열기(아이디, 버튼이름);
    await this.해제사유칸.fill(사유);
    await this.창.누르기('확인');
  }
}
