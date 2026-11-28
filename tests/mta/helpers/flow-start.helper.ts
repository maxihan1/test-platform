import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 보이나, 움직이는화면에서, 칸비우기, 키누르기, 클립보드쓰기, 앱다시켜기 } from '@platform/kit/parts';

import { 개인정보화면 } from '../pages/privacy.page.js';
import { 규칙화면 } from '../pages/rules.page.js';
import { 가입서버고르기, 로그인서버고르기, 서버오류창, 초대링크창 } from '../pages/server-pick.page.js';
import { 가입양식, type 가입칸 } from '../pages/signup.page.js';
import { 시작화면 } from '../pages/start.page.js';
import { 홈화면 } from '../pages/home.page.js';
import { 꾸러미, 서버 } from './app.helper.js';
import { api, type 계정, 푸시구독읽기 } from './api.helper.js';
import { 시작화면열기, 홈에들어가기 } from './login.helper.js';
import { 새사용자명 } from './test-data.helper.js';

export const 가입초대링크 = `https://${서버}/invite/qajoinmt`;

export function 새이메일(): string {
  return `${새사용자명('tc_signup')}@maxihan.com`;
}

export function 가입사용자명(길이: number): string {
  return `tc_signup${'a'.repeat(Math.max(0, 길이 - 'tc_signup'.length))}`;
}

export function 새암호(): string {
  return `Qa!${Date.now().toString(36)}x`;
}

async function 열린창닫기(driver: AppDriver): Promise<void> {
  if (await 보이나(driver, 서버오류창.글)) await new 서버오류창(driver).확인누르기();
  if (await 보이나(driver, 초대링크창.입력칸)) await new 초대링크창(driver).취소누르기();
}

export async function 시작화면으로(driver: AppDriver): Promise<void> {
  const 시작 = new 시작화면(driver);
  const 닿음 = await 움직이는화면에서(driver, async () => {
    for (let 번 = 0; 번 < 6; 번++) {
      if (await 보이나(driver, 시작화면.로그인버튼)) return true;
      await 열린창닫기(driver);
      await driver.back();
      if (await 시작.떴나(3_000)) return true;
    }
    return false;
  });
  if (!닿음) await 시작화면열기(driver);
}

export async function 가입서버고르기로가기(driver: AppDriver): Promise<boolean> {
  const 고르기 = new 가입서버고르기(driver);
  return 움직이는화면에서(driver, async () => {
    if (await 고르기.떴나(2_000)) return true;
    await 열린창닫기(driver);
    if (await 고르기.떴나(1_000)) return true;
    await 시작화면으로(driver);
    await new 시작화면(driver).다른서버선택누르기();
    return 고르기.떴나(30_000);
  });
}

export async function 로그인서버고르기로가기(driver: AppDriver): Promise<boolean> {
  const 고르기 = new 로그인서버고르기(driver);
  return 움직이는화면에서(driver, async () => {
    if (await 고르기.떴나(2_000)) return true;
    await 열린창닫기(driver);
    if (await 고르기.떴나(1_000)) return true;
    await 시작화면으로(driver);
    await new 시작화면(driver).로그인누르기();
    return 고르기.떴나(30_000);
  });
}

export async function 가입규칙화면으로(driver: AppDriver): Promise<boolean> {
  return 움직이는화면에서(driver, async () => {
    if (!(await 가입서버고르기로가기(driver))) return false;
    const 고르기 = new 가입서버고르기(driver);
    await 고르기.적기(서버);
    if (await 고르기.카드있나(서버, 20_000)) {
      await 고르기.카드고르기(서버);
      if (!(await 고르기.다음켜질때까지(10_000))) return false;
      await 고르기.다음누르기();
    } else {
      await 고르기.초대링크누르기();
      const 창 = new 초대링크창(driver);
      if (!(await 창.떴나())) return false;
      await 창.적기(가입초대링크);
      await 창.다음누르기();
    }
    return new 규칙화면(driver).떴나(60_000);
  });
}

export async function 가입양식열기(driver: AppDriver): Promise<boolean> {
  const 양식 = new 가입양식(driver);
  return 움직이는화면에서(driver, async () => {
    if (await 양식.떴나(2_000)) return true;
    if (!(await 가입규칙화면으로(driver))) return false;
    await new 규칙화면(driver).동의누르기();
    const 개인정보 = new 개인정보화면(driver);
    if (!(await 개인정보.떴나(30_000))) return false;
    await 개인정보.동의누르기();
    return 양식.떴나(60_000);
  });
}

export async function 가입양식채우기(driver: AppDriver, 값: Partial<Record<가입칸, string>> = {}): Promise<void> {
  const 양식 = new 가입양식(driver);
  const 암호 = 값.암호 ?? 새암호();
  const 채울값: Record<가입칸, string> = {
    이름: 'QA 가입',
    사용자명: 새사용자명('tc_signup'),
    이메일: 새이메일(),
    암호,
    '암호 확인': 암호,
    ...값,
  };
  for (const 이름 of ['이름', '사용자명', '이메일', '암호', '암호 확인'] as const) await 양식.적기(이름, 채울값[이름]);
}

export async function 서버입력에붙여넣기(driver: AppDriver, 글: string): Promise<void> {
  await 클립보드쓰기(driver, 글);
  const 칸 = await driver.$(가입서버고르기.입력칸).getElement();
  await 칸비우기(칸);
  await 칸.click();
  await 키누르기(driver, '붙여 넣기');
}

export async function 필터칩모두읽기(driver: AppDriver): Promise<string[]> {
  const 고르기 = new 가입서버고르기(driver);
  const 모음 = new Set<string>();
  for (const 글 of await 고르기.필터칩글들()) 모음.add(글);
  for (const 글 of await 고르기.속도칩메뉴글들()) 모음.add(글);
  for (let 번 = 0; 번 < 3; 번++) {
    await 고르기.지역칩까지굴리기();
    for (const 글 of await 고르기.필터칩글들()) 모음.add(글);
  }
  await 고르기.필터칩밀기('왼쪽');
  for (const 글 of await 고르기.필터칩글들()) 모음.add(글);
  return [...모음];
}

export async function 글이될때까지읽기(driver: AppDriver, 읽기: () => Promise<string>, 기대: string, 시간 = 10_000): Promise<string> {
  let 글 = '';
  await 될때까지(
    driver,
    async () => {
      글 = await 읽기();
      return 글 === 기대;
    },
    시간,
  );
  return 글;
}

export async function 오류문구가뜰때까지(driver: AppDriver, 양식: 가입양식, 문구: string, 시간 = 10_000): Promise<boolean> {
  return 될때까지(driver, async () => (await 양식.모든오류글()).some((글) => 글.includes(문구)), 시간);
}

export async function 홈다시열기(driver: AppDriver): Promise<void> {
  await 앱다시켜기(driver, 꾸러미);
  await 홈에들어가기(driver);
}

export async function 홈에서드롭다운열기(driver: AppDriver): Promise<void> {
  await 홈다시열기(driver);
  await new 홈화면(driver).드롭다운열기();
}

export async function 홈에들어가기안전(driver: AppDriver): Promise<void> {
  if (await new 시작화면(driver).로그인버튼보이나()) await driver.back();
  await 홈에들어가기(driver);
}

export async function 필터키워드(누구: 계정, 제목: string): Promise<string> {
  const 필터들 = await api<{ title: string; keywords: { keyword: string }[] }[]>(누구, 'GET', '/api/v2/filters');
  return 필터들.find((필터) => 필터.title === 제목)?.keywords[0]?.keyword ?? '';
}

export async function 푸시구독등록됐나(누구: 계정): Promise<boolean> {
  try {
    const 구독 = await 푸시구독읽기(누구);
    return typeof 구독.endpoint === 'string' && 구독.endpoint !== '';
  } catch {
    return false;
  }
}
