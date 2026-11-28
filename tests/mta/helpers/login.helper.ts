import type { AppDriver } from '@platform/kit/app';
import { 권한창답하기, 될때까지, 먼저뜨는것, 뜰때까지, 앱비우기, 움직이는화면에서 } from '@platform/kit/parts';

import { 홈화면 } from '../pages/home.page.js';
import { 앱id } from './app.helper.js';

export const 권한허용버튼 = 'id=com.android.permissioncontroller:id/permission_allow_button';
export const 시작로그인버튼 = 앱id('btn_log_in');
export const 홈탭 = 앱id('tab_home');

async function 지금화면(driver: AppDriver, 시간: number): Promise<'권한' | '홈탭' | '시작' | undefined> {
  return 움직이는화면에서(driver, () => 먼저뜨는것(driver, { 권한: 권한허용버튼, 홈탭, 시작: 시작로그인버튼 }, 시간));
}

export async function 홈에들어가기(driver: AppDriver): Promise<void> {
  for (let 번 = 0; 번 < 6; 번++) {
    const 지금 = await 지금화면(driver, 번 === 0 ? 40_000 : 8_000);
    if (지금 === '권한') {
      await 권한창답하기(driver, '허용');
      continue;
    }
    if (지금 === '시작') throw new Error('로그인된 채 켜지 않아 시작 화면이 떴다 — 앱 안 로그인은 Chrome OAuth 라 도우미가 대신 못 한다');
    if (지금 === '홈탭') {
      await driver.$(홈탭).click();
      if (await 뜰때까지(driver, 앱id('settings'), 5_000)) return 홈제목맞추기(driver);
      await driver.$(홈탭).click();
      if (await 뜰때까지(driver, 앱id('settings'), 5_000)) return 홈제목맞추기(driver);
      continue;
    }
    await driver.back();
  }
  throw new Error('홈 화면으로 돌아오지 못했다 — 하단 탭과 홈 설정 아이콘이 안 보인다');
}

async function 홈제목맞추기(driver: AppDriver): Promise<void> {
  const 홈 = new 홈화면(driver);
  const 제목 = await 홈.제목();
  if (제목 === '' || 제목 === '홈') return;
  await 홈.드롭다운열기();
  await 홈.드롭다운항목누르기('홈');
  if (!(await 될때까지(driver, async () => (await 홈.제목()) === '홈', 10_000))) throw new Error(`홈 위 고르개를 「${제목}」에서 「홈」으로 못 돌렸다`);
}

export async function 시작화면열기(driver: AppDriver): Promise<void> {
  const 지금 = await 지금화면(driver, 40_000);
  if (지금 === '시작') return;
  await 앱비우기(driver);
  if (!(await 움직이는화면에서(driver, () => 뜰때까지(driver, 시작로그인버튼, 60_000)))) {
    throw new Error('앱 데이터를 지운 뒤에도 시작 화면 「로그인」 버튼이 안 보인다');
  }
}
