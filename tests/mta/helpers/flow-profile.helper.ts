import type { AppDriver } from '@platform/kit/app';
import { 두번누르기, 뜰때까지, 요소안에서밀기, 키보드완료 } from '@platform/kit/parts';

import {
  type 계정,
  type 계정정보,
  type 관계,
  type 글,
  api,
  글자만,
  계정찾기,
  관계보기,
  뮤트,
  뮤트해제,
  목록지우기,
  언팔로우,
  차단,
  차단해제,
  팔로우,
} from './api.helper.js';
import { 모든글자, 목록안글자 } from './app.helper.js';
import type { 확인창 } from '../components/dialog.component.js';
import { 글카드 } from '../components/status-card.component.js';
import { 둘러보기화면 } from '../pages/explore.page.js';
import { 목록만들기화면 } from '../pages/list-create.page.js';
import { 팔로우목록화면 } from '../pages/follow-list.page.js';
import { 프로필편집화면 } from '../pages/profile-edit.page.js';
import type { 신고화면 } from '../pages/report.page.js';
import { 검색화면 } from '../pages/search.page.js';
import { 홈에들어가기 } from './login.helper.js';

export async function 검색입력화면으로(driver: AppDriver): Promise<void> {
  const 검색 = new 검색화면(driver);
  if (await 검색.입력칸있나(1_000)) return;
  await 홈에들어가기(driver);
  await 검색.열기();
}

export async function 검색제출하기(driver: AppDriver): Promise<void> {
  await 키보드완료(driver);
}

export async function 둘러보기맨위글(driver: AppDriver): Promise<string> {
  return (await 모든글자(driver, 둘러보기화면.유행글본문들))[0] ?? '';
}

export async function 둘러보기게시물내리기(driver: AppDriver, 번: number): Promise<void> {
  for (let i = 0; i < 번; i++) await 요소안에서밀기(driver, 글카드.목록, '위');
}

export function 본문조각(글: 글, 길이 = 20): string {
  const 첫줄 = 글자만(글.content)
    .split('\n')
    .map((줄) => 줄.trim())
    .find((줄) => 줄 !== '');
  return (첫줄 ?? '').slice(0, 길이);
}

export async function 창에글있나(창: 확인창, 글자: string): Promise<boolean> {
  const 제목 = await 창.제목글();
  const 본문 = await 창.글읽기();
  return 제목.includes(글자) || 본문.includes(글자);
}

export async function 프로필열어보기(driver: AppDriver, 사용자명: string): Promise<void> {
  await 홈에들어가기(driver);
  await new 검색화면(driver).프로필열기(사용자명);
}

export type 원하는관계 = { 팔로우?: boolean; 뮤트?: boolean; 차단?: boolean };

export async function 관계맞추기(나: 계정, 사용자명: string, 원함: 원하는관계): Promise<관계> {
  let 지금 = await 관계보기(나, 사용자명);
  if (원함.차단 !== undefined && 지금.blocking !== 원함.차단) 지금 = await (원함.차단 ? 차단 : 차단해제)(나, 사용자명);
  if (원함.뮤트 !== undefined && 지금.muting !== 원함.뮤트) 지금 = await (원함.뮤트 ? 뮤트 : 뮤트해제)(나, 사용자명);
  if (원함.팔로우 !== undefined && (지금.following || 지금.requested) !== 원함.팔로우) 지금 = await (원함.팔로우 ? 팔로우 : 언팔로우)(나, 사용자명);
  return 지금;
}

export async function 가입연도(나: 계정, 사용자명: string): Promise<number> {
  const 정보 = await api<{ created_at: string }>(나, 'GET', `/api/v1/accounts/lookup?acct=${encodeURIComponent(사용자명)}`);
  return new Date(정보.created_at).getFullYear();
}

export async function 프로필라벨있나(driver: AppDriver, 글자: string, 시간 = 5_000): Promise<boolean> {
  return 뜰때까지(driver, 목록안글자(글자, 'profile_header'), 시간);
}

export async function 아는팔로워있는계정(나: 계정, 후보들: string[]): Promise<{ 사용자명: string; 이름들: string[]; 계정들: string[] }> {
  for (const 사용자명 of 후보들) {
    const 대상 = await 계정찾기(나, 사용자명);
    const 답 = await api<{ id: string; accounts: 계정정보[] }[]>(나, 'GET', `/api/v1/accounts/familiar_followers?id[]=${대상.id}`);
    const 아는 = 답[0]?.accounts ?? [];
    if (아는.length > 0) return { 사용자명, 이름들: 아는.map((x) => (x.display_name === '' ? x.username : x.display_name)), 계정들: 아는.map((x) => x.username) };
  }
  throw new Error(`아는 팔로워가 있는 계정을 못 찾았다 — 후보 ${후보들.join(', ')}`);
}

export async function 팔로우목록제목글(driver: AppDriver): Promise<string> {
  return (await new 팔로우목록화면(driver).위막대글들()).join(' ');
}

export async function 나를차단했나(나: 계정, 사용자명: string): Promise<boolean> {
  const 대상 = await 계정찾기(나, 사용자명);
  const 줄 = await api<{ blocked_by: boolean }[]>(나, 'GET', `/api/v1/accounts/relationships?id[]=${대상.id}`);
  return 줄[0]?.blocked_by ?? false;
}

export type 프로필원본 = { display_name: string; note: string; fields: { name: string; value: string }[] };

type 내계정원본 = { display_name: string; source?: { note?: string; fields?: { name: string; value: string }[] } };

export async function 프로필원본읽기(나: 계정): Promise<프로필원본> {
  const 정보 = await api<내계정원본>(나, 'GET', '/api/v1/accounts/verify_credentials');
  return { display_name: 정보.display_name, note: 정보.source?.note ?? '', fields: (정보.source?.fields ?? []).map((칸) => ({ name: 칸.name, value: 칸.value })) };
}

async function 프로필보내기(나: 계정, 값: Record<string, unknown>): Promise<void> {
  await api(나, 'PATCH', '/api/v1/accounts/update_credentials', 값);
}

export async function 프로필되돌리기(나: 계정, 원본: 프로필원본): Promise<void> {
  await 프로필보내기(나, { display_name: 원본.display_name, note: 원본.note, fields_attributes: 원본.fields.length > 0 ? 원본.fields : [{ name: '', value: '' }] });
}

export async function 소개비우기(나: 계정): Promise<void> {
  await 프로필보내기(나, { note: '' });
}

export async function 프로필항목맞추기(나: 계정, 총개수: number, 머리: string): Promise<void> {
  const 지금 = await 프로필원본읽기(나);
  const 남길것 = 지금.fields.filter((칸) => !칸.name.startsWith('QA'));
  const 모자람 = 총개수 - 남길것.length;
  if (모자람 < 0) throw new Error(`QA 가 아닌 프로필 항목이 이미 ${String(남길것.length)}개라 ${String(총개수)}개로 맞출 수 없다`);
  const 더할것 = Array.from({ length: 모자람 }, (_, i) => ({ name: i === 0 ? 머리 : `${머리}${String(i + 1)}`, value: 'QA' }));
  await 프로필보내기(나, { fields_attributes: [...남길것, ...더할것].length > 0 ? [...남길것, ...더할것] : [{ name: '', value: '' }] });
}

type 소개태그 = { id: string; name: string };

export async function 소개해시태그들(나: 계정): Promise<소개태그[]> {
  return api<소개태그[]>(나, 'GET', '/api/v1/featured_tags');
}

export async function 소개해시태그QA지우기(나: 계정, 머리: string): Promise<void> {
  for (const 태그 of await 소개해시태그들(나)) if (태그.name.toLowerCase().startsWith(머리.toLowerCase())) await api(나, 'DELETE', `/api/v1/featured_tags/${태그.id}`);
}

export async function 소개해시태그맞추기(나: 계정, 총개수: number, 머리: string): Promise<void> {
  await 소개해시태그QA지우기(나, 머리);
  const 남은 = (await 소개해시태그들(나)).length;
  if (남은 > 총개수) throw new Error(`QA 가 아닌 소개 해시태그가 이미 ${String(남은)}개라 ${String(총개수)}개로 맞출 수 없다`);
  for (let i = 0; i < 총개수 - 남은; i++) await api(나, 'POST', '/api/v1/featured_tags', { name: `${머리}${String(i + 1)}` });
}

export async function 프로필편집으로(driver: AppDriver): Promise<프로필편집화면> {
  const 편집 = new 프로필편집화면(driver);
  await 홈에들어가기(driver);
  await 편집.열기();
  return 편집;
}

export async function QA목록만들기(나: 계정, 제목: string, 구성원들: string[] = []): Promise<string> {
  await 목록지우기(나, 제목);
  const 목록 = await api<{ id: string }>(나, 'POST', '/api/v1/lists', { title: 제목 });
  for (const 사용자명 of 구성원들) {
    const 대상 = await 계정찾기(나, 사용자명);
    await api(나, 'POST', `/api/v1/lists/${목록.id}/accounts`, { account_ids: [대상.id] });
  }
  return 목록.id;
}

export async function 목록구성원사용자명들(나: 계정, 목록id: string): Promise<string[]> {
  const 줄 = await api<{ username: string }[]>(나, 'GET', `/api/v1/lists/${목록id}/accounts`);
  return 줄.map((x) => x.username);
}

const 신고목록설명들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/subtitle"))';

export async function 신고이유설명글들(driver: AppDriver): Promise<string[]> {
  return 모든글자(driver, 신고목록설명들);
}

export async function 신고끝까지보내기(신고: 신고화면): Promise<void> {
  for (let i = 0; i < 5; i++) {
    if (await 신고.완료떴나(3_000)) return;
    await 신고.다음누르기();
  }
  if (!(await 신고.완료떴나(15_000))) throw new Error('신고 완료 화면이 안 떴다');
}

export async function 만들기빠르게두번누르기(driver: AppDriver): Promise<void> {
  await 두번누르기(await driver.$(목록만들기화면.단계버튼).getElement());
}
