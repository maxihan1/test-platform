import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 보이나, 뜰때까지, 사라질때까지, 칸에적기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 알림글 } from '../components/toast.component.js';
import { 홈화면 } from '../pages/home.page.js';
import { 목록화면 } from '../pages/lists.page.js';
import { 필터화면 } from '../pages/filter-edit.page.js';
import { 프로필화면 } from '../pages/profile.page.js';
import { 신고화면 } from '../pages/report.page.js';
import { 설정화면 } from '../pages/settings.page.js';

import { 꾸러미, 앱id } from './app.helper.js';
import { 홈으로, 프로필열기 } from './nav.helper.js';

export async function 글이될때까지읽기(driver: AppDriver, 선택자: string, 글: string, 시간 = 10_000): Promise<string> {
  let 읽은 = '';
  await 될때까지(
    driver,
    async () => {
      const 요소 = driver.$(선택자);
      if (!(await 요소.isExisting())) return false;
      읽은 = await 요소.getText();
      return 읽은 === 글;
    },
    시간,
  );
  return 읽은;
}

export async function 스낵바글기다리기(driver: AppDriver, 포함글: string, 시간 = 10_000): Promise<string> {
  const 스낵바 = new 알림글(driver).스낵바;
  let 읽은 = '';
  await 될때까지(
    driver,
    async () => {
      const 요소 = driver.$(스낵바);
      if (!(await 요소.isExisting())) return false;
      읽은 = await 요소.getText();
      return 읽은.includes(포함글);
    },
    시간,
  );
  return 읽은;
}

export async function 설정열기(driver: AppDriver): Promise<boolean> {
  await driver.$(앱id('settings')).click();
  return new 설정화면(driver).그려질때까지();
}

export async function 설정줄열기(driver: AppDriver, 줄: string, 제목 = 줄): Promise<boolean> {
  const 설정 = new 설정화면(driver);
  await 설정.줄누르기(줄);
  return (await 글이될때까지읽기(driver, 설정.제목, 제목)) === 제목;
}

export async function 계정설정열기(driver: AppDriver, 계정글: string): Promise<boolean> {
  const 설정 = new 설정화면(driver);
  if (!(await 설정열기(driver))) return false;
  await driver.$(설정.줄(계정글)).click();
  return (await 글이될때까지읽기(driver, 설정.계정제목, 계정글)) === 계정글;
}

export async function 뮤트풀기(driver: AppDriver, 사용자명: string): Promise<void> {
  await 홈으로(driver);
  await 프로필열기(driver, 사용자명);
  const 프로필 = new 프로필화면(driver);
  if (await 보이나(driver, 프로필.배지('Muted'))) {
    await 프로필.동작누르기();
    await 사라질때까지(driver, 프로필.배지('Muted'), 10_000);
  }
}

export async function 차단풀기(driver: AppDriver, 사용자명: string): Promise<void> {
  await 홈으로(driver);
  await 프로필열기(driver, 사용자명);
  const 프로필 = new 프로필화면(driver);
  if ((await 프로필.동작글()) === 'Unblock') {
    await 프로필.동작누르기();
    await 될때까지(driver, async () => (await 프로필.동작글()) !== 'Unblock', 10_000);
  }
}

export async function 계정신고열기(driver: AppDriver, 사용자명: string): Promise<boolean> {
  await 프로필열기(driver, 사용자명);
  const 프로필 = new 프로필화면(driver);
  await 프로필.메뉴열기();
  await 프로필.메뉴항목누르기('Report account');
  return new 신고화면(driver).그려질때까지();
}

export async function 신고의견칸까지(driver: AppDriver, 이유: string): Promise<boolean> {
  const 신고 = new 신고화면(driver);
  await 신고.이유고르기(이유);
  await 신고.첫다음누르기();
  return 신고.의견화면까지();
}

export async function 목록만들기화면열기(driver: AppDriver): Promise<boolean> {
  const 홈 = new 홈화면(driver);
  await 홈으로(driver);
  await 홈.드롭다운열기();
  await 홈.메뉴.고르기('목록');
  await 홈.메뉴.고르기('목록 만들기');
  return 뜰때까지(driver, new 목록화면(driver).이름칸, 15_000);
}

export async function 목록만들기(driver: AppDriver, 이름: string): Promise<boolean> {
  const 목록 = new 목록화면(driver);
  if (!(await 목록만들기화면열기(driver))) return false;
  await 칸에적기(await driver.$(목록.이름칸).getElement(), 이름);
  await driver.$(목록.만들기).click();
  if (!(await 뜰때까지(driver, 목록.완료, 15_000))) return false;
  await driver.$(목록.완료).click();
  return true;
}

export async function 목록지우기(driver: AppDriver, 이름: string): Promise<void> {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  await 홈으로(driver);
  await 홈.드롭다운열기();
  await 홈.메뉴.고르기('목록');
  if (!(await 홈.메뉴.뜰때까지(이름, 5_000))) {
    await 홈.메뉴.닫기();
    return;
  }
  await 홈.메뉴.고르기(이름);
  await 뜰때까지(driver, 홈.목록관리, 15_000);
  await driver.$(홈.목록관리).click();
  await 뜰때까지(driver, 목록.편집더보기, 15_000);
  await driver.$(목록.편집더보기).click();
  await 홈.메뉴.고르기('리스트 삭제');
  const 창 = new 확인창(driver);
  if (await 창.뜰때까지(10_000)) await 창.확인();
}

export async function 필터지우기(driver: AppDriver, 계정글: string, 제목: string): Promise<void> {
  const 설정 = new 설정화면(driver);
  const 필터 = new 필터화면(driver);
  const 창 = new 확인창(driver);
  await 홈으로(driver);
  if (!(await 계정설정열기(driver, 계정글))) return;
  if (!(await 설정줄열기(driver, '필터'))) return;
  if (!(await 뜰때까지(driver, 필터.줄(제목), 5_000))) return;
  await 필터.줄누르기(제목);
  await 뜰때까지(driver, 필터.화면글정확히('필터 삭제'), 10_000);
  await driver.$(필터.화면글정확히('필터 삭제')).click();
  if (await 창.뜰때까지(10_000)) await 창.확인();
  await 설정.그려질때까지();
}

export async function 앱데이터지우고켜기(driver: AppDriver): Promise<void> {
  await driver.execute('mobile: clearApp', { appId: 꾸러미 });
  await driver.activateApp(꾸러미);
}

export async function 클립보드글(driver: AppDriver): Promise<string> {
  const 값 = (await driver.execute('mobile: getClipboard', {})) as string;
  return Buffer.from(값, 'base64').toString('utf-8');
}
