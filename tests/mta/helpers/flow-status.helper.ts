import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뒤로보냈다오기, 뜰때까지, 보이나, 사라질때까지, 요소안에서밀기 } from '@platform/kit/parts';

import { 펼친메뉴 } from '../components/popup-menu.component.js';
import { 글카드 } from '../components/status-card.component.js';
import { 하단탭 } from '../components/tabbar.component.js';
import { 계정설정화면 } from '../pages/account-settings.page.js';
import { 동작설정화면 } from '../pages/behavior-settings.page.js';
import { 필터목록화면 } from '../pages/filters.page.js';
import { 홈화면 } from '../pages/home.page.js';
import { 알림화면 } from '../pages/notifications.page.js';
import { 프로필글목록 } from '../pages/profile-feed.page.js';
import { 프로필화면 } from '../pages/profile.page.js';
import { 검색화면 } from '../pages/search.page.js';
import { 설정화면 } from '../pages/settings.page.js';
import { 글상세화면 } from '../pages/thread.page.js';
import { 알림설정화면 } from '../pages/notification-settings.page.js';
import { type 계정, type 계정정보, type 글, api, 글자만, 사람글들, 푸시구독찾기 } from './api.helper.js';
import { 굴려서글자포함, 꾸러미, 서버 } from './app.helper.js';
import { 홈에들어가기, 홈탭 } from './login.helper.js';
import { 토스트에글자있나, 토스트읽기 } from './system-ui.helper.js';

const 화면부모 = `android=new UiSelector().resourceId("${꾸러미}:id/fragment_wrap")`;

export function 화면글자포함(글자: string): string {
  return `${화면부모}.childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
}

export function 화면글자(글자: string): string {
  return `${화면부모}.childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
}

export async function 화면글자포함있나(driver: AppDriver, 글자: string, 시간 = 5_000): Promise<boolean> {
  return 뜰때까지(driver, 화면글자포함(글자), 시간);
}

export async function 화면글자있나(driver: AppDriver, 글자: string, 시간 = 5_000): Promise<boolean> {
  return 뜰때까지(driver, 화면글자(글자), 시간);
}

export async function 화면글자포함사라질때까지(driver: AppDriver, 글자: string, 시간 = 10_000): Promise<boolean> {
  return 사라질때까지(driver, 화면글자포함(글자), 시간);
}

export async function 화면글자포함읽기(driver: AppDriver, 글자: string): Promise<string> {
  if (!(await 화면글자포함있나(driver, 글자, 8_000))) return '';
  return driver.$(화면글자포함(글자)).getText();
}

export async function 화면글자포함누르기(driver: AppDriver, 글자: string): Promise<void> {
  if (!(await 화면글자포함있나(driver, 글자, 10_000))) throw new Error(`화면에 「${글자}」가 든 글이 안 보인다`);
  await driver.$(화면글자포함(글자)).click();
}

export async function 화면글자누르기(driver: AppDriver, 글자: string): Promise<void> {
  if (!(await 화면글자있나(driver, 글자, 10_000))) throw new Error(`화면에 「${글자}」 글이 안 보인다`);
  await driver.$(화면글자(글자)).click();
}

export async function 토스트떴나(driver: AppDriver, 시간 = 6_000): Promise<boolean> {
  try {
    return (await 토스트읽기(driver, 시간)) !== '';
  } catch {
    return false;
  }
}

export function 이름(정보: Pick<계정정보, 'display_name' | 'username'>): string {
  return 정보.display_name.trim() === '' ? 정보.username : 정보.display_name;
}

export function 카드글자(x: 글): string {
  const 첫줄 = 글자만(x.content).split('\n').map((줄) => 줄.trim()).find((줄) => 줄 !== '' && !줄.startsWith('RE:')) ?? '';
  const 앞 = 첫줄.slice(0, 28).replace(/[\u{1F000}-\u{1FFFF}\u{2190}-\u{2BFF}\u{FE0F}].*$/u, '');
  const 칸 = 앞.indexOf(':');
  return (칸 > 0 ? 앞.slice(0, 칸) : 앞).trim();
}

export function 평범한글(x: 글): boolean {
  return (
    x.visibility === 'public' &&
    x.reblog === null &&
    x.in_reply_to_id === null &&
    x.spoiler_text === '' &&
    x.poll === null &&
    x.card === null &&
    x.media_attachments.length === 0 &&
    !x.sensitive &&
    !x.quote &&
    !x.reblogged &&
    글자만(x.content).length >= 8 &&
    글자만(x.content).length <= 120 &&
    !글자만(x.content).startsWith('@')
  );
}

export async function 고정글들(누구: 계정, 사용자명: string): Promise<글[]> {
  const 대상 = await api<{ id: string }>(누구, 'GET', `/api/v1/accounts/lookup?acct=${encodeURIComponent(사용자명)}`);
  return api<글[]>(누구, 'GET', `/api/v1/accounts/${대상.id}/statuses?pinned=true&limit=40`);
}

export type 통계글 = 글 & { favourites_count: number; reblogs_count: number; replies_count: number };

export async function 글통계(누구: 계정, id: string): Promise<통계글> {
  return api<통계글>(누구, 'GET', `/api/v1/statuses/${id}`);
}

export async function 긴글찾기(누구: 계정, 사용자명: string): Promise<글> {
  const 글들 = (await 사람글들(누구, 사용자명)).filter((x) => x.reblog === null && x.spoiler_text === '' && x.visibility === 'public');
  글들.sort((가, 나) => 글자만(나.content).length - 글자만(가.content).length);
  const 찾음 = 글들[0];
  if (!찾음) throw new Error(`${사용자명} 의 글 가운데 「긴 글」이 없다`);
  return 찾음;
}

export async function 만료필터만들기(누구: 계정, 제목: string): Promise<void> {
  await api(누구, 'POST', '/api/v2/filters', {
    title: 제목,
    context: ['home'],
    filter_action: 'warn',
    expires_in: 1,
    keywords_attributes: [{ keyword: `${제목} 낱말`, whole_word: false }],
  });
}

export async function 푸시알림종류켜기(누구: 계정, 종류: string): Promise<void> {
  await api(누구, 'PUT', '/api/v1/push/subscription', { data: { alerts: { [종류]: true } } });
}

export async function 홈에서글찾기(driver: AppDriver, 글자: string): Promise<void> {
  if (!(await new 글카드(driver).찾을때까지내리기(글자))) throw new Error(`홈에 「${글자}」 글 카드가 안 보인다`);
}

export async function 친구목록에서글찾기(driver: AppDriver, 글자: string): Promise<void> {
  const 홈 = new 홈화면(driver);
  await 홈에들어가기(driver);
  await 홈.목록고르기('친구');
  if (await 홈.새로고침해맨위에올때까지(글자, 15_000)) return;
  if (!(await new 글카드(driver).찾을때까지내리기(글자))) throw new Error(`목록 「친구」에서 「${글자}」 글 카드를 못 찾았다`);
}

export async function 프로필열고글찾기(driver: AppDriver, 사용자명: string, 글자: string): Promise<void> {
  await new 검색화면(driver).프로필열기(사용자명);
  if (!(await new 프로필글목록(driver).글찾을때까지내리기(글자))) throw new Error(`${사용자명} 프로필에서 「${글자}」 글 카드를 못 찾았다`);
}

export async function 프로필열고경고문찾기(driver: AppDriver, 사용자명: string, 경고문: string, 번 = 8): Promise<void> {
  await new 검색화면(driver).프로필열기(사용자명);
  const 카드 = new 글카드(driver);
  const 프로필 = new 프로필화면(driver);
  for (let i = 0; i <= 번; i++) {
    if (await 될때까지(driver, async () => (await 카드.경고문글들()).some((글) => 글.includes(경고문)), 3_000)) return;
    if (i < 번) await 프로필.바깥으로내리기();
  }
  throw new Error(`${사용자명} 프로필에서 경고문 「${경고문}」 글 카드를 못 찾았다`);
}

export async function 민감글열기(driver: AppDriver, 사용자명: string, 글: 글): Promise<void> {
  if (글.spoiler_text === '') {
    await 프로필열고글찾기(driver, 사용자명, 카드글자(글));
    return;
  }
  await 프로필열고경고문찾기(driver, 사용자명, 글.spoiler_text);
  await new 글카드(driver).경고동작누르기(글.spoiler_text);
}

export async function 더보기있나(driver: AppDriver, 글자: string): Promise<boolean> {
  try {
    return await 뜰때까지(driver, await new 글카드(driver).더보기주소(글자), 3_000);
  } catch {
    return false;
  }
}

export async function 더보기열기(driver: AppDriver, 글자: string): Promise<펼친메뉴> {
  await new 글카드(driver).더보기누르기(글자);
  const 메뉴 = new 펼친메뉴(driver);
  if (!(await 메뉴.떴나(10_000))) throw new Error(`「${글자}」 글 더보기 메뉴가 안 열렸다`);
  return 메뉴;
}

export async function 글상세열기(driver: AppDriver, 글주소: string | null): Promise<글상세화면> {
  if (글주소 === null) throw new Error('글 주소가 비어 있다');
  await new 검색화면(driver).주소열기(글주소);
  const 상세 = new 글상세화면(driver);
  if (!(await 상세.떴나(20_000))) throw new Error('글 상세가 안 열렸다');
  return 상세;
}

export async function 홈새로고침해서글자보일때까지(driver: AppDriver, 글자: string, 시간 = 45_000): Promise<boolean> {
  const 홈 = new 홈화면(driver);
  return 될때까지(
    driver,
    async () => {
      if (await 화면글자포함있나(driver, 글자, 2_000)) return true;
      await 홈.당겨서새로고침();
      return 화면글자포함있나(driver, 글자, 6_000);
    },
    시간,
  );
}

export async function 알림탭열기(driver: AppDriver): Promise<알림화면> {
  await 홈에들어가기(driver);
  await new 하단탭(driver).누르기('알림');
  const 알림 = new 알림화면(driver);
  if (!(await 알림.떴나(20_000))) throw new Error('알림 화면이 안 열렸다');
  return 알림;
}

export async function 알림에서줄찾을때까지(driver: AppDriver, 글자: string, 시간 = 60_000): Promise<boolean> {
  const 알림 = new 알림화면(driver);
  return 될때까지(
    driver,
    async () => {
      if (await 알림.줄있나(글자, 2_000)) return true;
      await 요소안에서밀기(driver, 알림화면.목록, '아래');
      if (await 알림.줄있나(글자, 6_000)) return true;
      await 뒤로보냈다오기(driver, 3);
      return 알림.줄있나(글자, 6_000);
    },
    시간,
  );
}

export async function 알림에서줄이사라진채인가(driver: AppDriver, 글자: string): Promise<boolean> {
  return !(await new 알림화면(driver).줄있나(글자, 3_000));
}

export async function 계정설정열기(driver: AppDriver, 사용자명: string): Promise<계정설정화면> {
  await 홈에들어가기(driver);
  await new 홈화면(driver).설정누르기();
  const 설정 = new 설정화면(driver);
  if (!(await 설정.떴나(15_000))) throw new Error('설정 화면이 안 열렸다');
  await 설정.계정줄누르기(`@${사용자명}@${서버}`);
  const 계정설정 = new 계정설정화면(driver);
  if (!(await 계정설정.떴나(15_000))) throw new Error('계정 설정 화면이 안 열렸다');
  return 계정설정;
}

export async function 필터목록열기(driver: AppDriver, 사용자명: string): Promise<필터목록화면> {
  const 계정설정 = await 계정설정열기(driver, 사용자명);
  await 계정설정.줄누르기('필터');
  const 필터목록 = new 필터목록화면(driver);
  if (!(await 필터목록.떴나(15_000))) throw new Error('필터 목록 화면이 안 열렸다');
  return 필터목록;
}

export async function 알림설정열기(driver: AppDriver, 사용자명: string): Promise<알림설정화면> {
  const 계정설정 = await 계정설정열기(driver, 사용자명);
  await 계정설정.줄누르기('알림');
  const 알림설정 = new 알림설정화면(driver);
  if (!(await 알림설정.떴나(15_000))) throw new Error('알림 설정 화면이 안 열렸다');
  return 알림설정;
}

async function 설정에서홈으로(driver: AppDriver): Promise<void> {
  const 설정 = new 설정화면(driver);
  if (await 설정.떴나(5_000)) await driver.back();
  await 뜰때까지(driver, 홈탭, 10_000);
}

export async function 동작스위치맞추기(driver: AppDriver, 줄: string, 켜기: boolean): Promise<void> {
  await 홈에들어가기(driver);
  await new 홈화면(driver).설정누르기();
  const 설정 = new 설정화면(driver);
  if (!(await 설정.떴나(15_000))) throw new Error('설정 화면이 안 열렸다');
  await 설정.동작누르기();
  const 동작 = new 동작설정화면(driver);
  if (!(await 동작.떴나(15_000))) throw new Error('동작 설정 화면이 안 열렸다');
  if ((await 동작.스위치켜졌나(줄)) !== 켜기) await 동작.스위치누르기(줄);
  await 동작.위로누르기();
  await 설정에서홈으로(driver);
}

export async function 동작스위치켜졌나(driver: AppDriver, 줄: string): Promise<boolean> {
  await 홈에들어가기(driver);
  await new 홈화면(driver).설정누르기();
  const 설정 = new 설정화면(driver);
  if (!(await 설정.떴나(15_000))) throw new Error('설정 화면이 안 열렸다');
  await 설정.동작누르기();
  const 동작 = new 동작설정화면(driver);
  if (!(await 동작.떴나(15_000))) throw new Error('동작 설정 화면이 안 열렸다');
  const 켜짐 = await 동작.스위치켜졌나(줄);
  await 동작.위로누르기();
  await 설정에서홈으로(driver);
  return 켜짐;
}

export async function 글상세에서앞이위인가(driver: AppDriver, 앞글자: string, 뒤글자: string): Promise<boolean> {
  const 카드 = new 글카드(driver);
  for (let i = 0; i < 5; i++) {
    if ((await 카드.보이나(앞글자)) && (await 카드.보이나(뒤글자))) return (await 카드.본문y(앞글자)) < (await 카드.본문y(뒤글자));
    await 요소안에서밀기(driver, 글상세화면.목록, i < 3 ? '아래' : '위');
  }
  return false;
}

export async function 화면에서굴려글자찾기(driver: AppDriver, 글자: string): Promise<boolean> {
  if (await 보이나(driver, 화면글자포함(글자))) return true;
  return (await driver.$(굴려서글자포함(글자)).isExisting()) && (await 화면글자포함있나(driver, 글자, 3_000));
}

export async function 안내글보이나(driver: AppDriver, 글자: string): Promise<boolean> {
  if (await 화면글자포함있나(driver, 글자, 3_000)) return true;
  return 토스트에글자있나(driver, 글자, 3_000);
}

export async function 뷰어컨트롤있나(driver: AppDriver, 설명: string): Promise<boolean> {
  return 뜰때까지(driver, `android=new UiSelector().resourceId("${꾸러미}:id/photo_viewer_overlay").childSelector(new UiSelector().descriptionContains(${JSON.stringify(설명)}))`, 5_000);
}

export async function 뷰어진행막대있나(driver: AppDriver): Promise<boolean> {
  return 뜰때까지(driver, `android=new UiSelector().resourceId("${꾸러미}:id/photo_viewer_overlay").childSelector(new UiSelector().className("android.widget.SeekBar"))`, 5_000);
}


export async function 결과버튼글이될때까지(driver: AppDriver, 글자: string, 기대글: string, 시간 = 10_000): Promise<boolean> {
  const 카드 = new 글카드(driver);
  return 될때까지(
    driver,
    async () => {
      try {
        return (await 카드.결과버튼글(글자)) === 기대글;
      } catch {
        return false;
      }
    },
    시간,
  );
}

export async function 투표버튼켜질때까지(driver: AppDriver, 글자: string, 시간 = 10_000): Promise<boolean> {
  const 카드 = new 글카드(driver);
  return 될때까지(
    driver,
    async () => {
      try {
        return await 카드.투표버튼켜졌나(글자);
      } catch {
        return false;
      }
    },
    시간,
  );
}

export type 신고알림 = { id: string; type: string; account: 계정정보; report?: { id: string; target_account: 계정정보 } };

export async function 신고알림들(누구: 계정): Promise<신고알림[]> {
  return api<신고알림[]>(누구, 'GET', '/api/v1/notifications?limit=40&types[]=admin.report');
}

export async function 역할이름(누구: 계정): Promise<string> {
  const 정보 = await api<{ role?: { name: string } | null }>(누구, 'GET', '/api/v1/accounts/verify_credentials');
  return 정보.role?.name ?? '';
}

export async function 신고하기(누구: 계정, 대상계정id: string, 내용: string): Promise<void> {
  await api(누구, 'POST', '/api/v1/reports', { account_id: 대상계정id, comment: 내용, forward: false });
}

export async function 창닫기(driver: AppDriver): Promise<void> {
  await driver.back();
}

export async function 푸시알림종류들켜졌나(누구: 계정, 종류들: string[]): Promise<boolean> {
  const 구독 = await 푸시구독찾기(누구);
  if (구독 === undefined) return false;
  const { alerts } = 구독;
  const 모두 = 'quote' in alerts ? [...종류들, 'quote'] : 종류들;
  return 모두.every((종류) => alerts[종류] === true);
}

export async function 알림일시중지끄기(driver: AppDriver, 사용자명: string): Promise<void> {
  const 알림설정 = await 알림설정열기(driver, 사용자명);
  if (await 알림설정.일시중지켜졌나()) await 알림설정.일시중지스위치누르기();
}
