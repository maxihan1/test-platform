import type { Locator, Page, Response } from '@playwright/test';

const 관리주소 = (응답: Response, 경로: string, 방식 = 'GET'): boolean =>
  응답.request().method() === 방식 && new URL(응답.url()).pathname === `/admin${경로}`;

export class 백오피스화면 {
  static readonly 주소 = '/backoffice';

  readonly 키칸: Locator;
  readonly 키저장버튼: Locator;
  readonly 캐릭터탭: Locator;
  readonly 확률탭: Locator;
  readonly 스폰탭: Locator;
  readonly 정리탭: Locator;
  readonly 알림: Locator;
  readonly 오류알림: Locator;
  readonly 성공알림: Locator;

  readonly 이름칸: Locator;
  readonly 계정칸: Locator;
  readonly 검색버튼: Locator;
  readonly 목록머리칸들: Locator;
  readonly 캐릭터줄들: Locator;

  readonly 상세제목: Locator;
  readonly 상세표줄들: Locator;
  readonly 상세표이름칸들: Locator;
  readonly 값바꾸기제목: Locator;
  readonly 골드칸: Locator;
  readonly 레벨칸: Locator;
  readonly 성향칸: Locator;
  readonly 위치x칸: Locator;
  readonly 위치z칸: Locator;
  readonly 보라해제: Locator;
  readonly 적용버튼: Locator;
  readonly 초기화버튼: Locator;
  readonly 지급버튼: Locator;
  readonly 인벤토리제목: Locator;
  readonly 골드원장제목: Locator;
  readonly 강화이력제목: Locator;

  readonly 결과고정제목: Locator;
  readonly 강화고정고르기: Locator;
  readonly 강화고정추가: Locator;
  readonly 대기중: Locator;
  readonly 모두비우기버튼: Locator;
  readonly 강화확률목표칸들: Locator;
  readonly 봇전리품칸: Locator;
  readonly 악명봇칸: Locator;

  readonly 스폰추가제목: Locator;
  readonly 스폰ID칸: Locator;
  readonly 스폰구역: Locator;
  readonly 스폰몬스터: Locator;
  readonly 스폰x칸: Locator;
  readonly 스폰z칸: Locator;
  readonly 스폰저장버튼: Locator;
  readonly 기본값복원버튼: Locator;
  readonly 스폰수제목: Locator;
  readonly 스폰줄들: Locator;
  readonly 스폰ID칸들: Locator;

  readonly 계정삭제제목: Locator;
  readonly 계정삭제버튼: Locator;
  readonly 월드초기화버튼: Locator;

  constructor(private readonly page: Page) {
    const 머리 = page.getByRole('banner');
    this.키칸 = 머리.getByRole('textbox', { name: 'X-Admin-Key' });
    this.키저장버튼 = 머리.getByRole('button', { name: '키 저장' });
    const 탭 = 머리.getByRole('navigation');
    this.캐릭터탭 = 탭.getByRole('button', { name: '캐릭터', exact: true });
    this.확률탭 = 탭.getByRole('button', { name: '확률·결과 고정' });
    this.스폰탭 = 탭.getByRole('button', { name: '스폰', exact: true });
    this.정리탭 = 탭.getByRole('button', { name: '정리', exact: true });
    this.알림 = page.locator('#toast');
    this.오류알림 = page.locator('#toast.err');
    this.성공알림 = page.locator('#toast.ok');

    const 캐릭터 = page.locator('#characters');
    this.이름칸 = 캐릭터.getByPlaceholder('캐릭터 이름 일부');
    this.계정칸 = 캐릭터.getByPlaceholder('계정 ID');
    this.검색버튼 = 캐릭터.getByRole('button', { name: '검색' });
    this.목록머리칸들 = 캐릭터.getByRole('table').first().getByRole('columnheader');
    this.캐릭터줄들 = page.locator('#char-list').getByRole('row');

    const 상세 = page.locator('#detail');
    this.상세제목 = page.locator('#d-title');
    this.상세표줄들 = page.locator('#d-stats').getByRole('row');
    this.상세표이름칸들 = page.locator('#d-stats tr > td:first-child');
    this.값바꾸기제목 = 상세.getByRole('heading', { name: '값 바꾸기' });
    this.골드칸 = page.locator('#e-gold');
    this.레벨칸 = page.locator('#e-level');
    this.성향칸 = page.locator('#e-align');
    this.위치x칸 = page.locator('#e-x');
    this.위치z칸 = page.locator('#e-z');
    this.보라해제 = 상세.getByRole('checkbox', { name: '보라 해제' });
    this.적용버튼 = 상세.getByRole('button', { name: '적용' });
    this.초기화버튼 = 상세.getByRole('button', { name: '새 캐릭터 상태로 초기화' });
    this.지급버튼 = 상세.getByRole('button', { name: '지급' });
    this.인벤토리제목 = 상세.getByRole('heading', { name: '인벤토리', exact: true });
    this.골드원장제목 = 상세.getByRole('heading', { name: '골드 원장 (최근 100)', exact: true });
    this.강화이력제목 = 상세.getByRole('heading', { name: '강화 이력', exact: true });

    const 확률 = page.locator('#control');
    this.결과고정제목 = 확률.getByRole('heading', { name: '결과 고정 (다음 판정부터 차례로)' });
    this.강화고정고르기 = page.locator('#f-enh');
    this.강화고정추가 = page.locator('#f-enh').locator('..').getByRole('button', { name: '추가' });
    this.대기중 = page.locator('#f-queue');
    this.모두비우기버튼 = 확률.getByRole('button', { name: '모두 비우기' });
    this.강화확률목표칸들 = page.locator('#c-rates tr > td:first-child');
    this.봇전리품칸 = page.locator('#c-loot');
    this.악명봇칸 = page.locator('#c-loot-c');

    const 스폰 = page.locator('#spawns');
    this.스폰추가제목 = 스폰.getByRole('heading', { name: '스폰 추가·수정' });
    this.스폰ID칸 = 스폰.getByPlaceholder('T01');
    this.스폰구역 = page.locator('#s-zone');
    this.스폰몬스터 = page.locator('#s-monster');
    this.스폰x칸 = page.locator('#s-x');
    this.스폰z칸 = page.locator('#s-z');
    this.스폰저장버튼 = 스폰.getByRole('button', { name: '저장' });
    this.기본값복원버튼 = 스폰.getByRole('button', { name: '기본값 복원' });
    this.스폰수제목 = page.locator('#s-count');
    this.스폰줄들 = page.locator('#s-list').getByRole('row');
    this.스폰ID칸들 = page.locator('#s-list tr > td:first-child');

    const 정리 = page.locator('#cleanup');
    this.계정삭제제목 = 정리.getByRole('heading', { name: '테스트 계정 삭제' });
    this.계정삭제버튼 = 정리.getByRole('button', { name: '삭제' });
    this.월드초기화버튼 = 정리.getByRole('button', { name: '바닥 아이템·봇 초기화' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(백오피스화면.주소);
    await this.키칸.waitFor();
    await this.검색버튼.waitFor();
  }

  async 다시그려질때까지(): Promise<void> {
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }

  private async 응답기다리며(경로: string, 조작: () => Promise<void>, 방식 = 'GET'): Promise<Response> {
    const 응답 = this.page.waitForResponse((r) => 관리주소(r, 경로, 방식));
    await 조작();
    const 받음 = await 응답;
    await 받음.finished();
    await this.다시그려질때까지();
    return 받음;
  }

  async 키저장(키: string): Promise<Response> {
    await this.키칸.fill(키);
    return this.응답기다리며('/item-templates', () => this.키저장버튼.click());
  }

  async 키저장하고목록기다리기(키: string): Promise<Response> {
    await this.키칸.fill(키);
    return this.응답기다리며('/characters', () => this.키저장버튼.click());
  }

  async 새로고침하고목록기다리기(): Promise<Response> {
    return this.응답기다리며('/characters', async () => {
      await this.page.reload();
    });
  }

  async 키없이검색(): Promise<void> {
    await this.응답기다리며('/characters', () => this.검색버튼.click());
    await this.오류알림.waitFor();
  }

  async 검색(이름: string, 계정: string): Promise<void> {
    await this.이름칸.fill(이름);
    await this.계정칸.fill(계정);
    await this.응답기다리며('/characters', () => this.검색버튼.click());
  }

  async 줄칸글(줄: Locator): Promise<string[]> {
    return 줄.getByRole('cell').allInnerTexts();
  }

  async 캐릭터열기(줄: Locator): Promise<void> {
    await 줄.click();
    await this.상세표줄들.first().waitFor();
    await this.다시그려질때까지();
  }

  async 확인창문구받고취소(버튼: Locator): Promise<string> {
    const 문구 = new Promise<string>((받기) => {
      this.page.once('dialog', (창) => {
        받기(창.message());
        void 창.dismiss();
      });
    });
    await 버튼.click();
    return 문구;
  }

  async 확률탭열기(): Promise<void> {
    await this.응답기다리며('/config', () => this.확률탭.click());
  }

  async 확률탭다시열기(): Promise<void> {
    await this.캐릭터탭.click();
    await this.확률탭열기();
  }

  async 강화고정넣기(결과: string): Promise<void> {
    await this.강화고정고르기.selectOption(결과);
    await this.응답기다리며('/forced', () => this.강화고정추가.click(), 'POST');
  }

  async 결과고정비우기(): Promise<void> {
    await this.응답기다리며('/forced', () => this.모두비우기버튼.click(), 'DELETE');
  }

  async 스폰탭열기(): Promise<void> {
    await this.응답기다리며('/spawns', () => this.스폰탭.click());
  }

  async 스폰탭다시열기(): Promise<void> {
    await this.캐릭터탭.click();
    await this.스폰탭열기();
  }

  async 스폰저장(아이디: string, 구역: string, 몬스터: string, x: string, z: string): Promise<Response> {
    await this.스폰ID칸.fill(아이디);
    await this.스폰구역.selectOption(구역);
    await this.스폰몬스터.selectOption(몬스터);
    await this.스폰x칸.fill(x);
    await this.스폰z칸.fill(z);
    const 저장응답 = this.page.waitForResponse((r) => r.request().method() === 'PUT' && new URL(r.url()).pathname.startsWith('/admin/spawns'));
    const 목록응답 = this.page.waitForResponse((r) => 관리주소(r, '/spawns')).catch(() => null);
    await this.스폰저장버튼.click();
    const 받음 = await 저장응답;
    await 받음.finished();
    if (받음.ok()) {
      const 목록 = await 목록응답;
      await 목록?.finished();
    }
    await this.다시그려질때까지();
    return 받음;
  }

  스폰줄(아이디: string): Locator {
    return this.스폰줄들.filter({ has: this.page.getByRole('cell', { name: 아이디, exact: true }) });
  }

  async 스폰칸값들(): Promise<string[]> {
    return [
      await this.스폰ID칸.inputValue(),
      await this.스폰구역.inputValue(),
      await this.스폰몬스터.inputValue(),
      await this.스폰x칸.inputValue(),
      await this.스폰z칸.inputValue(),
    ];
  }
}
