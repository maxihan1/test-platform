import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 해시태그관리화면 } from '../pages/hashtag-manage.page.js';
import { 홈화면 } from '../pages/home.page.js';
import { 글상세화면 } from '../pages/thread.page.js';

import { 글읽기 } from './app.helper.js';
import { 내프로필에서글열기 } from './post.helper.js';
import { 스낵바글기다리기 } from './settings-flow.helper.js';
import { 홈으로 } from './nav.helper.js';

export async function 해시태그관리열기(driver: AppDriver): Promise<boolean> {
  const 홈 = new 홈화면(driver);
  await 홈으로(driver);
  await 홈.드롭다운열기();
  await 홈.메뉴.고르기('팔로우 중인 해시태그');
  await 홈.메뉴.고르기('해시태그 관리');
  return new 해시태그관리화면(driver).그려질때까지();
}

export async function 해시태그팔로우풀기(driver: AppDriver, 태그: string): Promise<void> {
  const 관리 = new 해시태그관리화면(driver);
  if (!(await 해시태그관리열기(driver))) throw new Error('해시태그 관리 화면이 안 열려 팔로우를 풀지 못했다');
  const 제목들 = await 관리.글들(관리.줄제목들);
  if (!제목들.includes(태그)) return;
  if (제목들[0] !== 태그) throw new Error(`「${태그}」가 해시태그 관리 첫 줄이 아니라 팔로우를 풀지 못했다`);
  await 관리.첫해제버튼누르기();
  const 항목글 = await 글읽기(driver, 관리.해제메뉴항목);
  if (!항목글.includes(`#${태그} `)) throw new Error(`해제 메뉴가 「#${태그}」의 것이 아니다`);
  await driver.$(관리.해제메뉴항목).click();
  const 창 = new 확인창(driver);
  if (!(await 창.뜰때까지())) throw new Error('팔로우 해제 확인 창이 안 떴다');
  await 창.확인();
}

export async function 글고정하고스낵바읽기(driver: AppDriver, 본문: string, 기다릴글: string, 시간 = 10_000): Promise<string> {
  const 글상세 = new 글상세화면(driver);
  await 내프로필에서글열기(driver, 본문);
  await 글상세.더보기열기();
  await 뜰때까지(driver, 글상세.메뉴.항목포함('고정'), 10_000);
  await driver.$(글상세.메뉴.항목포함('고정')).click();
  return 스낵바글기다리기(driver, 기다릴글, 시간);
}
