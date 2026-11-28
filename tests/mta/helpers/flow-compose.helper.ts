import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지, 될때까지 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 부스트시트 } from '../components/boost-sheet.component.js';
import { 글카드 } from '../components/status-card.component.js';
import { 펼친메뉴 } from '../components/popup-menu.component.js';
import { 하단탭 } from '../components/tabbar.component.js';
import { api, type 계정, type 글, 글자만, 내정보 } from './api.helper.js';
import { 서버 } from './app.helper.js';
import { 홈에들어가기 } from './login.helper.js';
import { 고르기창항목들, 사진선택기본문, 사진선택기에서첫사진고르기, 설정줄, 줄부제, 줄있나 } from './system-ui.helper.js';
import { 계정설정화면 } from '../pages/account-settings.page.js';
import { 앱정보화면 } from '../pages/about.page.js';
import { 동작설정화면 } from '../pages/behavior-settings.page.js';
import { 글쓰기화면 } from '../pages/compose.page.js';
import { 디스플레이설정화면 } from '../pages/display-settings.page.js';
import { 홈화면 } from '../pages/home.page.js';
import { 게시기본값화면 } from '../pages/posting-defaults.page.js';
import { 프라이버시설정화면 } from '../pages/privacy-settings.page.js';
import { 프로필화면 } from '../pages/profile.page.js';
import { 검색화면 } from '../pages/search.page.js';
import { 설정화면 } from '../pages/settings.page.js';
import { 글상세화면 } from '../pages/thread.page.js';

export async function 글쓰기닫고홈으로(driver: AppDriver): Promise<void> {
  const 창 = new 확인창(driver);
  if (await 창.떴나(1_000)) await 창.취소누르기();
  const 글쓰기 = new 글쓰기화면(driver);
  if ((await 글쓰기.새게시물떴나(2_000)) || (await 글쓰기.수정화면떴나(1_000))) {
    await 글쓰기.닫기누르기();
    const 닫기창 = 글쓰기.닫기확인창();
    if (await 닫기창.떴나(2_000)) {
      await 닫기창.확인누르기();
      await 닫기창.사라질때까지();
    }
    await 글쓰기.닫혔나(10_000);
  }
  await 홈에들어가기(driver);
}

export async function 새글쓰기열기(driver: AppDriver): Promise<글쓰기화면> {
  await 글쓰기닫고홈으로(driver);
  await new 홈화면(driver).글쓰기누르기();
  const 글쓰기 = new 글쓰기화면(driver);
  if (!(await 글쓰기.새게시물떴나(15_000))) throw new Error('새 글쓰기 화면이 안 열렸다');
  return 글쓰기;
}

export async function 새글쓰기이어서(driver: AppDriver): Promise<글쓰기화면> {
  const 글쓰기 = new 글쓰기화면(driver);
  if (await 글쓰기.새게시물떴나(3_000)) return 글쓰기;
  return 새글쓰기열기(driver);
}

export function 글조각(대상: 글): string {
  return 글자만(대상.content).slice(0, 12).trim();
}

export async function 글열기(driver: AppDriver, 대상: 글): Promise<글상세화면> {
  await 글쓰기닫고홈으로(driver);
  await new 검색화면(driver).주소열기(대상.url ?? 대상.uri);
  const 상세 = new 글상세화면(driver);
  if (!(await 상세.떴나(20_000))) throw new Error('글 상세 화면이 안 열렸다');
  return 상세;
}

export async function 글에서버튼누르기(driver: AppDriver, 대상: 글, 버튼: '답장' | '부스트' | '공유'): Promise<void> {
  const 카드 = new 글카드(driver);
  if (!(await 카드.찾을때까지내리기(글조각(대상)))) throw new Error(`「${글조각(대상)}」 글 카드가 안 보인다`);
  await 카드.버튼누르기(글조각(대상), 버튼);
}

export async function 내글수정화면열기(driver: AppDriver, 대상: 글): Promise<글쓰기화면> {
  await 글열기(driver, 대상);
  await new 글카드(driver).더보기누르기(글조각(대상));
  await new 펼친메뉴(driver).항목누르기('수정');
  const 글쓰기 = new 글쓰기화면(driver);
  if (!(await 글쓰기.수정화면떴나(15_000))) throw new Error('글 수정 화면이 안 열렸다');
  return 글쓰기;
}

export async function 인용하기누르기(driver: AppDriver, 대상: 글): Promise<void> {
  await 글에서버튼누르기(driver, 대상, '부스트');
  const 시트 = new 부스트시트(driver);
  if (!(await 시트.떴나(10_000))) throw new Error('부스트 시트가 안 떴다');
  await 시트.항목누르기('인용하기');
}

export async function 인용글쓰기열기(driver: AppDriver, 대상: 글): Promise<void> {
  await 글열기(driver, 대상);
  await 인용하기누르기(driver, 대상);
}

export async function 인용글쓰기가열릴때까지(driver: AppDriver): Promise<글쓰기화면> {
  const 글쓰기 = new 글쓰기화면(driver);
  if (!(await 글쓰기.새게시물떴나(15_000))) throw new Error('인용 글쓰기 화면이 안 열렸다');
  return 글쓰기;
}

export async function 조용한공개인용창넘기기(driver: AppDriver): Promise<void> {
  const 창 = new 글쓰기화면(driver).조용한공개인용창();
  if (!(await 창.떴나(10_000))) throw new Error('「조용한 공개 게시물 인용하기」 창이 안 떴다');
  if ((await 창.확인버튼글()) === '무시') await 창.확인누르기();
  else if ((await 창.취소버튼글()) === '무시') await 창.취소누르기();
  else if ((await 창.세번째버튼있나()) && (await 창.세번째버튼글()) === '무시') await 창.세번째누르기();
  else throw new Error('「조용한 공개 게시물 인용하기」 창에 「무시」 버튼이 없다');
}

export async function 내글들(나: 계정, 머리: string): Promise<글[]> {
  const 정보 = await 내정보(나);
  const 글들 = await api<글[]>(나, 'GET', `/api/v1/accounts/${정보.id}/statuses?limit=40`);
  return 글들.filter((x) => x.reblog === null && 글자만(x.content).startsWith(머리));
}

export async function 올라온글기다리기(driver: AppDriver, 나: 계정, 머리: string, 시간 = 30_000): Promise<글 | undefined> {
  let 찾음: 글 | undefined;
  await 될때까지(
    driver,
    async () => {
      찾음 = (await 내글들(나, 머리))[0];
      return 찾음 !== undefined;
    },
    시간,
  );
  return 찾음;
}

export async function 게시기본값읽기(나: 계정): Promise<string> {
  return (await 내정보(나)).source?.privacy ?? '';
}

export async function 게시기본값바꾸기(나: 계정, 값: string): Promise<void> {
  await api<unknown>(나, 'PATCH', '/api/v1/accounts/update_credentials', { source: { privacy: 값 } });
}

export async function 검색허용읽기(나: 계정): Promise<boolean> {
  return (await 내정보(나)).source?.indexable ?? false;
}

export async function 토큰살았나(토큰: string): Promise<boolean> {
  const 응답 = await fetch(new URL('/api/v1/accounts/verify_credentials', `https://${서버}`), {
    headers: { authorization: `Bearer ${토큰}` },
    signal: AbortSignal.timeout(20_000),
  });
  return 응답.status === 200;
}

export async function 굴려서줄있나(driver: AppDriver, 글자: string): Promise<boolean> {
  if (await 줄있나(driver, 글자, 2_000)) return true;
  try {
    await 줄부제(driver, 글자);
    return true;
  } catch {
    return false;
  }
}

export async function 줄켜졌나(driver: AppDriver, 글자: string): Promise<boolean> {
  if (!(await 굴려서줄있나(driver, 글자))) throw new Error(`설정 줄 「${글자}」이 안 보인다`);
  return (await driver.$(설정줄(글자)).getAttribute('enabled')) === 'true';
}

export async function 고르기창닫기(driver: AppDriver): Promise<boolean> {
  await driver.back();
  return 사라질때까지(driver, 고르기창항목들, 5_000);
}

export async function 선택창닫기(driver: AppDriver): Promise<boolean> {
  await driver.back();
  return 뜰때까지(driver, 게시기본값화면.목록, 5_000);
}

export async function 화면에글자있나(driver: AppDriver, 글자: string, 시간 = 5_000): Promise<boolean> {
  return 뜰때까지(driver, 글쓰기화면.창글자(글자), 시간);
}

export async function 사진선택기닫기(driver: AppDriver): Promise<boolean> {
  await driver.back();
  return 사라질때까지(driver, 사진선택기본문, 5_000);
}

export async function 사진붙이기(driver: AppDriver, 글쓰기: 글쓰기화면): Promise<void> {
  await 글쓰기.도구누르기('미디어');
  await 사진선택기에서첫사진고르기(driver);
}

export async function 설정열기(driver: AppDriver): Promise<설정화면> {
  await 글쓰기닫고홈으로(driver);
  await new 홈화면(driver).설정누르기();
  const 설정 = new 설정화면(driver);
  if (!(await 설정.떴나(15_000))) throw new Error('설정 화면이 안 열렸다');
  return 설정;
}

export async function 동작설정열기(driver: AppDriver): Promise<동작설정화면> {
  const 설정 = await 설정열기(driver);
  await 설정.동작누르기();
  const 화면 = new 동작설정화면(driver);
  if (!(await 화면.떴나(15_000))) throw new Error('「동작」 설정 화면이 안 열렸다');
  return 화면;
}

export async function 디스플레이설정열기(driver: AppDriver): Promise<디스플레이설정화면> {
  const 설정 = await 설정열기(driver);
  await 설정.디스플레이누르기();
  const 화면 = new 디스플레이설정화면(driver);
  if (!(await 화면.떴나(15_000))) throw new Error('「디스플레이」 설정 화면이 안 열렸다');
  return 화면;
}

export async function 앱정보열기(driver: AppDriver): Promise<앱정보화면> {
  const 설정 = await 설정열기(driver);
  await 설정.앱정보누르기();
  const 화면 = new 앱정보화면(driver);
  if (!(await 화면.떴나(15_000))) throw new Error('「Mastodon에 대해」 화면이 안 열렸다');
  return 화면;
}

export async function 계정설정열기(driver: AppDriver): Promise<계정설정화면> {
  await 글쓰기닫고홈으로(driver);
  await new 하단탭(driver).누르기('프로필');
  const 프로필 = new 프로필화면(driver);
  if (!(await 프로필.떴나(20_000))) throw new Error('내 프로필 화면이 안 열렸다');
  await 프로필.메뉴열기();
  await new 펼친메뉴(driver).항목누르기('계정 설정');
  const 화면 = new 계정설정화면(driver);
  if (!(await 화면.떴나(15_000))) throw new Error('계정 설정 화면이 안 열렸다');
  return 화면;
}

export async function 프라이버시설정열기(driver: AppDriver): Promise<프라이버시설정화면> {
  const 계정설정 = await 계정설정열기(driver);
  await 계정설정.줄누르기('프라이버시와 노출 범위');
  const 화면 = new 프라이버시설정화면(driver);
  if (!(await 화면.떴나(15_000))) throw new Error('「프라이버시와 노출 범위」 화면이 안 열렸다');
  return 화면;
}

export async function 게시기본값열기(driver: AppDriver): Promise<게시기본값화면> {
  const 계정설정 = await 계정설정열기(driver);
  await 계정설정.줄누르기('게시 기본값');
  const 화면 = new 게시기본값화면(driver);
  if (!(await 화면.떴나(15_000))) throw new Error('「게시 기본값」 화면이 안 열렸다');
  return 화면;
}

export async function 게시기본값되돌리기(화면: 게시기본값화면, 게시범위: string, 공개범위: string): Promise<void> {
  await 화면.게시범위누르기();
  await 화면.선택창고르기(게시범위);
  if ((await 화면.공개범위글()) !== 공개범위) {
    await 화면.공개범위누르기();
    await 화면.선택창고르기(공개범위);
  }
  await 화면.위로누르기();
}

export async function 동작스위치맞추기(driver: AppDriver, 글자: string, 켜짐: boolean, 화면?: 동작설정화면): Promise<void> {
  const 동작 = 화면 ?? (await 동작설정열기(driver));
  if ((await 동작.스위치켜졌나(글자)) !== 켜짐) await 동작.스위치누르기(글자);
  const 맞음 = await 될때까지(driver, async () => (await 동작.스위치켜졌나(글자)) === 켜짐, 8_000);
  if (!맞음) throw new Error(`「${글자}」 스위치를 ${켜짐 ? '켜지' : '끄지'} 못했다`);
}

export async function 디스플레이스위치맞추기(driver: AppDriver, 글자: string, 켜짐: boolean): Promise<void> {
  const 디스플레이 = await 디스플레이설정열기(driver);
  if ((await 디스플레이.스위치켜졌나(글자)) !== 켜짐) await 디스플레이.스위치누르기(글자);
  const 맞음 = await 될때까지(driver, async () => (await 디스플레이.스위치켜졌나(글자)) === 켜짐, 8_000);
  if (!맞음) throw new Error(`「${글자}」 스위치를 ${켜짐 ? '켜지' : '끄지'} 못했다`);
}
