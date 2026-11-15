import type { AppDriver } from '@platform/kit/app';

import { 개인정보화면 } from '../pages/privacy-consent.page.js';
import { 서버규칙화면 } from '../pages/rules.page.js';
import { 서버고르기화면 } from '../pages/server-chooser.page.js';
import { 가입양식화면 } from '../pages/signup.page.js';
import { 계정전환시트 } from '../pages/account-switcher.page.js';
import { 시작화면 } from '../pages/start.page.js';
import { 웹로그인화면 } from '../pages/web-login.page.js';

import { 꾸러미 } from './app.helper.js';
import { 서버고르고다음, 시작화면열기, 웹승인화면까지, 웹으로로그인마치기 } from './login.helper.js';

export function 새이름(머리 = 'tc_signup', 길이 = 0): string {
  const 값 = `${머리}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return 길이 > 0 ? 값.padEnd(길이, 'x').slice(0, 길이) : 값;
}

export function 길이맞춘이메일(고유: string, 길이: number): string {
  const 앞 = 고유.padEnd(64, 'a').slice(0, 64);
  const 끝 = 'maxihan.com';
  let 채울 = 길이 - 앞.length - 1 - 끝.length - 1;
  const 라벨들: string[] = [];
  while (채울 > 0) {
    let 칸 = Math.min(63, 채울);
    if (채울 - 칸 === 1) 칸 -= 1;
    라벨들.push('a'.repeat(칸));
    채울 -= 칸;
    if (채울 > 0) 채울 -= 1;
  }
  return `${앞}@${[...라벨들, 끝].join('.')}`;
}

export function 길이맞춘암호(길이: number): string {
  return 'Pw1!'.padEnd(길이, 'x');
}

export async function 가입서버고르기까지(driver: AppDriver): Promise<void> {
  await 시작화면열기(driver);
  const 시작 = new 시작화면(driver);
  await 시작.그려질때까지();
  await 시작.누르기('다른서버선택');
  await new 서버고르기화면(driver).그려질때까지();
}

export async function 로그인서버고르기까지(driver: AppDriver): Promise<void> {
  await 시작화면열기(driver);
  const 시작 = new 시작화면(driver);
  await 시작.그려질때까지();
  await 시작.누르기('로그인');
  await new 서버고르기화면(driver).그려질때까지();
}

export async function 서버규칙화면까지(driver: AppDriver): Promise<void> {
  await 가입서버고르기까지(driver);
  await 서버고르고다음(driver);
  await new 서버규칙화면(driver).그려질때까지();
}

export async function 개인정보화면까지(driver: AppDriver): Promise<void> {
  await 서버규칙화면까지(driver);
  await new 서버규칙화면(driver).동의누르기();
  await new 개인정보화면(driver).그려질때까지();
}

export async function 가입양식까지(driver: AppDriver): Promise<void> {
  await 개인정보화면까지(driver);
  await new 개인정보화면(driver).동의누르기();
  await new 가입양식화면(driver).그려질때까지();
}

export async function 웹승인화면까지가기(driver: AppDriver, 아이디: string | undefined, 암호: string | undefined): Promise<void> {
  if (!아이디 || !암호) throw new Error('로그인 계정 값이 비었다 — 대상 서버 줄에 그 역할 계정이 있어야 한다');
  await 로그인서버고르기까지(driver);
  await 서버고르고다음(driver);
  await 웹승인화면까지(driver, 아이디, 암호);
}

export async function 승인누르기까지(driver: AppDriver, 아이디: string | undefined, 암호: string | undefined): Promise<void> {
  await 웹승인화면까지가기(driver, 아이디, 암호);
  await new 웹로그인화면(driver).승인누르기();
}

export async function 승인누르고이메일확인화면으로(driver: AppDriver, 아이디: string | undefined, 암호: string | undefined): Promise<void> {
  await 웹승인화면까지가기(driver, 아이디, 암호);
  await new 웹로그인화면(driver).승인누르기();
}

export async function 계정추가로그인(driver: AppDriver, 아이디: string | undefined, 암호: string | undefined): Promise<void> {
  if (!아이디 || !암호) throw new Error('로그인 계정 값이 비었다 — 대상 서버 줄에 그 역할 계정이 있어야 한다');
  const 시트 = new 계정전환시트(driver);
  await 시트.열기();
  await 시트.계정추가누르기();
  const 시작 = new 시작화면(driver);
  await 시작.그려질때까지();
  await 시작.누르기('로그인');
  await new 서버고르기화면(driver).그려질때까지();
  await 서버고르고다음(driver);
  await 웹으로로그인마치기(driver, 아이디, 암호);
}

export async function 앱링크열기(driver: AppDriver, 주소: string): Promise<void> {
  await driver.execute('mobile: deepLink', { url: 주소, package: 꾸러미 });
}

export async function 시스템링크열기(driver: AppDriver, 주소: string): Promise<void> {
  await driver.execute('mobile: deepLink', { url: 주소 });
}

export async function 텍스트공유하기(driver: AppDriver, 제목: string, 본문: string): Promise<void> {
  await driver.execute('mobile: startActivity', {
    intent: `${꾸러미}/.MainActivity`,
    action: 'android.intent.action.SEND',
    mimeType: 'text/plain',
    extras: [
      ['s', 'android.intent.extra.SUBJECT', 제목],
      ['s', 'android.intent.extra.TEXT', 본문],
    ],
  });
}

export async function 앱화면떠있나(driver: AppDriver): Promise<boolean> {
  const 상태 = await driver.execute('mobile: queryAppState', { appId: 꾸러미 });
  return 상태 === 4;
}
