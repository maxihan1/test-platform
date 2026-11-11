import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 계정상세화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 카운터: Locator;
  readonly 상태: Locator;
  readonly 정보표: Locator;
  readonly 역할칸: Locator;
  readonly 이메일상태칸: Locator;
  readonly 경고: Locator;
  readonly 동결: Locator;
  readonly 동결해제: Locator;
  readonly 민감함강제: Locator;
  readonly 민감함취소: Locator;
  readonly 제한: Locator;
  readonly 제한해제: Locator;
  readonly 정지: Locator;
  readonly 정지해제: Locator;
  readonly 데이터삭제: Locator;
  readonly 허가: Locator;
  readonly 거부: Locator;
  readonly 신원확인: Locator;
  readonly 고인전환: Locator;
  readonly 역할변경: Locator;
  readonly 이메일바꾸기: Locator;
  readonly 암호초기화: Locator;
  readonly 확인링크다시보내기: Locator;
  readonly 처벌들: Locator;
  readonly 참고사항칸: Locator;
  readonly 참고사항남기기: Locator;
  readonly 참고사항들: Locator;
  readonly 정지안내: Locator;
  readonly 처벌문구: Locator;
  readonly 프로필카드: Locator;
  readonly 표시이름: Locator;
  readonly 프로필아이디: Locator;
  readonly 이메일도메인차단: Locator;
  readonly 처벌카드들: Locator;
  readonly 가입이유말풍선: Locator;
  readonly 데이터삭제완료안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.알림 = new 알림(page);
    this.카운터 = page.locator('.dashboard__counters');
    this.상태 = this.카운터.locator('a[href*="action_logs"] .dashboard__counters__text');
    this.정보표 = page.locator('.table-wrapper table').first();
    this.역할칸 = this.정보표.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '역할', exact: true }) }).getByRole('cell').first();
    this.이메일상태칸 = this.정보표.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '이메일 상태', exact: true }) }).getByRole('cell').first();
    const 버튼 = (이름: string): Locator => page.locator('.action-buttons, .content').getByRole('link', { name: 이름, exact: true }).first();
    this.경고 = 버튼('경고');
    this.동결 = 버튼('동결');
    this.동결해제 = 버튼('동결 해제');
    this.민감함강제 = 버튼('민감함 강제');
    this.민감함취소 = 버튼('민감함으로 설정 취소');
    this.제한 = 버튼('제한');
    this.제한해제 = 버튼('제한 해제');
    this.정지 = 버튼('정지');
    this.정지해제 = 버튼('정지 해제');
    this.데이터삭제 = 버튼('데이터 삭제');
    this.허가 = 버튼('허가');
    this.거부 = 버튼('거부');
    this.신원확인 = 버튼('신원 확인');
    this.고인전환 = 버튼('고인의 계정으로 전환');
    this.역할변경 = page.getByRole('link', { name: '역할 변경' });
    this.이메일바꾸기 = page.getByRole('link', { name: '이메일 바꾸기' });
    this.암호초기화 = page.getByRole('link', { name: '암호 초기화' });
    this.확인링크다시보내기 = page.getByRole('link', { name: '확인 링크 다시 보내기' });
    this.처벌들 = page.locator('.strike-entry, .account__header__strikes, .log-entry').filter({ hasNotText: '참고사항' });
    this.참고사항칸 = page.getByPlaceholder('어떤 대응을 했는지 설명 또는 그 밖의 관련된 갱신 사항들');
    this.참고사항남기기 = page.getByRole('button', { name: '참고사항 남기기' });
    this.참고사항들 = page.locator('.report-notes__item');
    this.정지안내 = page.getByText('계정이 정지되었습니다, 그리고', { exact: false });
    this.처벌문구 = page.getByText(/이 계정에는 \d+번의 처벌이 있었습니다/);
    this.프로필카드 = page.locator('.h-card');
    this.표시이름 = this.프로필카드.locator('strong');
    this.프로필아이디 = this.프로필카드.getByText(/@\S+@\S+/);
    this.이메일도메인차단 = page.getByRole('link', { name: '이메일 도메인 차단' });
    this.처벌카드들 = page.locator('.account-strikes').getByRole('link');
    this.가입이유말풍선 = page.locator('.speech-bubble').filter({ hasText: '가입하려는 이유' });
    this.데이터삭제완료안내 = page.getByText('이 계정의 데이터는 복구할 수 없도록 삭제되었습니다');
  }

  async 열기(계정번호: string): Promise<void> {
    await this.page.goto(`${계정상세화면.주소}${계정번호}`);
    await this.제목.waitFor();
    await this.카운터.waitFor();
  }

  async 처벌수(): Promise<number> {
    if ((await this.처벌문구.count()) === 0) return 0;
    const 찾음 = /(\d+)번의 처벌/.exec(await this.처벌문구.first().innerText());
    return Number(찾음?.[1] ?? 0);
  }

  참고사항(글: string): Locator {
    return this.참고사항들.filter({ hasText: 글 });
  }

  참고사항삭제(글: string): Locator {
    return this.참고사항(글).getByRole('link', { name: '삭제' });
  }

  async 참고사항적기(글: string): Promise<void> {
    await this.참고사항칸.fill(글);
    await this.참고사항남기기.click();
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }

  카운터링크(이름: string): Locator {
    return this.카운터.getByRole('link', { name: new RegExp(`${이름}$`) });
  }

  정보줄(이름: string): Locator {
    return this.정보표.getByRole('rowheader', { name: 이름, exact: true });
  }

  async 누르고이동하기(버튼: Locator): Promise<void> {
    await 버튼.click();
    await this.page.waitForLoadState('load');
    await this.제목.waitFor();
  }

  async 삭제완료까지열기(계정번호: string): Promise<boolean> {
    for (let 회 = 0; 회 < 6; 회 += 1) {
      await this.page.goto(`${계정상세화면.주소}${계정번호}`);
      await this.제목.waitFor();
      if (await this.데이터삭제완료안내.waitFor({ timeout: 1_500 }).then(() => true, () => false)) return true;
    }
    return false;
  }
}
