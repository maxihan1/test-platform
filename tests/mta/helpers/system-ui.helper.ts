import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 보이나, 사라질때까지, 요소안에서밀기, type 앱요소 } from '@platform/kit/parts';

import { 굴려서글자포함, 꾸러미, 모든글자, 모든요소, 앱id, 지금토스트글들, 토스트글읽기 } from './app.helper.js';

export const 시스템토스트 = '//android.widget.Toast';
export const 설정목록 = 앱id('list');
export const 설정줄제목 = 앱id('title');
export const 설정줄부제 = 앱id('subtitle');
export const 위로이동 = '~상위 메뉴로 이동';
export const 스위치들 = 'android=new UiSelector().className("android.widget.Switch")';

export function 설정줄(글자: string, 목록 = 'list'): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${목록}").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)}))`;
}

export function 설정줄글자시작(글자: string, 목록 = 'list'): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/${목록}").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").textStartsWith(${JSON.stringify(글자)}))`;
}

export function 툴바글자(글자: string): string {
  return `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
}

async function 가운데y(요소: 앱요소): Promise<number> {
  const 자리 = await 요소.getLocation();
  const 크기 = await 요소.getSize();
  return 자리.y + 크기.height / 2;
}

async function 줄요소(driver: AppDriver, 글자: string): Promise<앱요소> {
  if (!(await 뜰때까지(driver, 설정줄(글자), 2_000))) await driver.$(굴려서글자포함(글자)).isExisting();
  if (!(await 뜰때까지(driver, 설정줄(글자), 8_000))) throw new Error(`설정 줄 「${글자}」이 안 보인다`);
  return driver.$(설정줄(글자)).getElement();
}

export async function 줄있나(driver: AppDriver, 글자: string, 시간 = 3_000): Promise<boolean> {
  return 뜰때까지(driver, 설정줄(글자), 시간);
}

export async function 줄누르기(driver: AppDriver, 글자: string): Promise<void> {
  await (await 줄요소(driver, 글자)).click();
}

export async function 줄제목들(driver: AppDriver): Promise<string[]> {
  return 모든글자(driver, 설정줄제목);
}

export async function 줄부제(driver: AppDriver, 글자: string): Promise<string> {
  const 제목 = await 줄요소(driver, 글자);
  const 자리 = await 제목.getLocation();
  const 아래 = 자리.y + (await 제목.getSize()).height;
  for (const 부제 of await 모든요소(driver, 설정줄부제)) {
    if (Math.abs((await 부제.getLocation()).y - 아래) < 25) return 부제.getText();
  }
  return '';
}

async function 줄스위치(driver: AppDriver, 글자: string): Promise<앱요소> {
  const 제목y = await 가운데y(await 줄요소(driver, 글자));
  for (const 스위치 of await 모든요소(driver, 스위치들)) {
    if (Math.abs((await 가운데y(스위치)) - 제목y) < 60) return 스위치;
  }
  throw new Error(`설정 줄 「${글자}」에 스위치가 없다`);
}

export async function 줄스위치켜졌나(driver: AppDriver, 글자: string): Promise<boolean> {
  return (await (await 줄스위치(driver, 글자)).getAttribute('checked')) === 'true';
}

export async function 줄스위치누르기(driver: AppDriver, 글자: string): Promise<void> {
  await (await 줄스위치(driver, 글자)).click();
}

export async function 줄스위치있나(driver: AppDriver, 글자: string): Promise<boolean> {
  try {
    await 줄스위치(driver, 글자);
    return true;
  } catch {
    return false;
  }
}

export const 고르기창항목들 = 'id=android:id/text1';

export function 고르기창줄(글자: string): string {
  return `android=new UiSelector().resourceId("android:id/text1").text(${JSON.stringify(글자)})`;
}

export async function 고르기창떴나(driver: AppDriver, 시간 = 10_000): Promise<boolean> {
  return 뜰때까지(driver, 고르기창항목들, 시간);
}

export async function 고르기창글들(driver: AppDriver): Promise<string[]> {
  return 모든글자(driver, 고르기창항목들);
}

export async function 고르기창줄있나(driver: AppDriver, 글자: string, 시간 = 3_000): Promise<boolean> {
  return 뜰때까지(driver, 고르기창줄(글자), 시간);
}

export async function 고르기창줄누르기(driver: AppDriver, 글자: string): Promise<void> {
  if (!(await 고르기창줄있나(driver, 글자, 10_000))) throw new Error(`고르기 창 항목 「${글자}」이 안 보인다`);
  await driver.$(고르기창줄(글자)).click();
}

export async function 고르기창줄골라졌나(driver: AppDriver, 글자: string): Promise<boolean> {
  if (!(await 고르기창줄있나(driver, 글자, 10_000))) return false;
  return (await driver.$(고르기창줄(글자)).getAttribute('checked')) === 'true';
}

export async function 토스트읽기(driver: AppDriver, 시간 = 8_000): Promise<string> {
  return 토스트글읽기(driver, 시간);
}

export async function 토스트에글자있나(driver: AppDriver, 글자: string, 시간 = 8_000): Promise<boolean> {
  return 될때까지(
    driver,
    async () => {
      try {
        return (await 지금토스트글들(driver)).some((글) => 글.includes(글자));
      } catch {
        return false;
      }
    },
    시간,
  );
}

export const 사진선택기본문 = '~미디어 그리드';
export const 사진선택기사진 = 'android=new UiSelector().descriptionContains("촬영한 사진").instance(0)';
export const 사진선택기완료 = 'android=new UiSelector().className("android.widget.TextView").text("완료")';

export async function 사진선택기떴나(driver: AppDriver, 시간 = 15_000): Promise<boolean> {
  return 뜰때까지(driver, 사진선택기본문, 시간);
}

export async function 사진선택기에서첫사진고르기(driver: AppDriver): Promise<void> {
  if (!(await 사진선택기떴나(driver))) throw new Error('사진 선택기가 안 떴다');
  await driver.$(사진선택기사진).click();
  if (!(await 뜰때까지(driver, 사진선택기완료, 10_000))) throw new Error('사진 선택기 「완료」가 안 보인다');
  await driver.$(사진선택기완료).click();
}

export function 파일선택기줄(이름: string): string {
  return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(이름)})`;
}

export async function 파일선택기에서고르기(driver: AppDriver, 이름: string, 시간 = 15_000): Promise<void> {
  if (!(await 뜰때까지(driver, 파일선택기줄(이름), 시간))) throw new Error(`파일 선택기에 「${이름}」이 안 보인다`);
  await driver.$(파일선택기줄(이름)).click();
}

export const 공유시트제목 = 'id=com.android.intentresolver:id/sem_chooser_main_title';
export const 공유시트앱칸 = 'id=com.android.intentresolver:id/sem_chooser_recycler_ranked_app';

export function 공유시트앱(이름: string): string {
  return `android=new UiSelector().resourceId("com.android.intentresolver:id/text1").text(${JSON.stringify(이름)})`;
}

export async function 공유시트떴나(driver: AppDriver, 시간 = 10_000): Promise<boolean> {
  return 뜰때까지(driver, 공유시트제목, 시간);
}

export async function 공유시트에앱있나(driver: AppDriver, 이름: string): Promise<boolean> {
  for (let 번 = 0; 번 < 5; 번++) {
    if (await 뜰때까지(driver, 공유시트앱(이름), 2_000)) return true;
    if (!(await 보이나(driver, 공유시트앱칸))) return false;
    await 요소안에서밀기(driver, 공유시트앱칸, '왼쪽');
  }
  return false;
}

export async function 공유시트에서앱누르기(driver: AppDriver, 이름: string): Promise<void> {
  if (!(await 공유시트에앱있나(driver, 이름))) throw new Error(`공유 시트에 「${이름}」이 안 보인다`);
  await driver.$(공유시트앱(이름)).click();
}

export async function 공유시트닫기(driver: AppDriver): Promise<boolean> {
  await driver.back();
  return 사라질때까지(driver, 공유시트제목, 5_000);
}

export const 크롬로그아웃상태유지 = 'id=com.android.chrome:id/signin_fre_dismiss_button';

export async function 크롬첫화면넘기기(driver: AppDriver): Promise<boolean> {
  if (!(await 뜰때까지(driver, 크롬로그아웃상태유지, 5_000))) return false;
  await driver.$(크롬로그아웃상태유지).click();
  return true;
}
