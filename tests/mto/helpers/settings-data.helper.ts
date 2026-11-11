import type { Page } from '@playwright/test';

import { 계정상세화면 } from '../pages/account-detail.page.js';
import { 공지사항폼화면 } from '../pages/announcement-form.page.js';
import { 공지사항화면 } from '../pages/announcements.page.js';
import { 커스텀에모지추가화면 } from '../pages/custom-emoji-new.page.js';
import { 커스텀에모지화면 } from '../pages/custom-emojis.page.js';
import { 역할폼화면 } from '../pages/role-form.page.js';
import { 역할화면 } from '../pages/roles.page.js';
import { 서버규칙화면 } from '../pages/rules.page.js';
import { 서버설정화면 } from '../pages/settings.page.js';
import { 역할변경화면 } from '../pages/user-role.page.js';
import { 경고프리셋화면 } from '../pages/warning-presets.page.js';
import { 웹훅상세화면 } from '../pages/webhook-detail.page.js';
import { 웹훅폼화면 } from '../pages/webhook-form.page.js';
import { 웹훅화면 } from '../pages/webhooks.page.js';
import { 계정번호 } from './api.helper.js';

const 크기표 = (() => {
  const 표: number[] = [];
  for (let 번호 = 0; 번호 < 256; 번호 += 1) {
    let 값 = 번호;
    for (let 칸 = 0; 칸 < 8; 칸 += 1) 값 = 값 & 1 ? 0xedb88320 ^ (값 >>> 1) : 값 >>> 1;
    표[번호] = 값 >>> 0;
  }
  return 표;
})();

function 검사합(바이트: Buffer): number {
  let 값 = 0xffffffff;
  for (const 한바이트 of 바이트) 값 = (크기표[(값 ^ 한바이트) & 0xff] ?? 0) ^ (값 >>> 8);
  return (값 ^ 0xffffffff) >>> 0;
}

function 청크(종류: string, 내용: Buffer): Buffer {
  const 길이 = Buffer.alloc(4);
  길이.writeUInt32BE(내용.length);
  const 본체 = Buffer.concat([Buffer.from(종류, 'ascii'), 내용]);
  const 합 = Buffer.alloc(4);
  합.writeUInt32BE(검사합(본체));
  return Buffer.concat([길이, 본체, 합]);
}

export function 그림만들기(총바이트 = 0): { name: string; mimeType: string; buffer: Buffer } {
  const 머리 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const 규격 = Buffer.alloc(13);
  규격.writeUInt32BE(8, 0);
  규격.writeUInt32BE(8, 4);
  규격[8] = 8;
  규격[9] = 2;
  const 앞 = [머리, 청크('IHDR', 규격), 청크('IDAT', Buffer.from([120,156,99,104,192,1,24,134,150,4,0,130,243,96,1]))];
  const 끝 = 청크('IEND', Buffer.alloc(0));
  const 기본 = Buffer.concat([...앞, 끝]).length;
  if (총바이트 > 기본) 앞.push(청크('prVt', Buffer.alloc(총바이트 - 기본 - 12, 0x20)));
  return { name: 'mto.png', mimeType: 'image/png', buffer: Buffer.concat([...앞, 끝]) };
}

export function 에모지코드(길이: number): string {
  let 글 = '';
  while (글.length < 길이) 글 += Math.random().toString(36).slice(2);
  return 글.slice(0, 길이);
}

export async function 연락처채우기(page: Page): Promise<void> {
  const 화면 = new 서버설정화면(page);
  await 화면.열기('branding');
  if ((await 화면.연락관리자.inputValue()) !== '' && (await 화면.연락이메일.inputValue()) !== '') return;
  await 화면.연락관리자.fill('qa_admin');
  await 화면.연락이메일.fill('qa-contact@maxihan.com');
  await 화면.저장하기();
  await 화면.알림.글('정상적으로 변경되었습니다!').waitFor();
}

export async function 서버규칙만들기(page: Page, 글: string): Promise<void> {
  const 화면 = new 서버규칙화면(page);
  await 화면.규칙더하기(글);
  await 화면.규칙줄(글).first().waitFor();
}

export async function 서버규칙정리(page: Page, 머리글: string): Promise<void> {
  const 화면 = new 서버규칙화면(page);
  await 화면.열기();
  while ((await 화면.규칙줄(머리글).count()) > 0) {
    await 화면.규칙지우기(머리글);
    await 화면.열기();
  }
}

export async function 경고프리셋만들기(page: Page, 제목: string, 본문: string): Promise<void> {
  const 화면 = new 경고프리셋화면(page);
  await 화면.열기();
  await 화면.적기(제목, 본문);
  await 화면.새로추가하고기다리기();
  await 화면.프리셋줄(제목).first().waitFor();
}

export async function 경고프리셋정리(page: Page, 제목: string): Promise<void> {
  await new 경고프리셋화면(page).프리셋지우기(제목);
}

export async function 역할만들기(page: Page, 이름: string, 우선순위: number, 권한이름들: string[]): Promise<void> {
  const 폼 = new 역할폼화면(page);
  const 목록 = new 역할화면(page);
  await 폼.추가하기(이름, 우선순위, 권한이름들);
  await 목록.카드(이름).waitFor();
}

export async function 역할정리(page: Page, 이름: string): Promise<void> {
  const 목록 = new 역할화면(page);
  const 폼 = new 역할폼화면(page);
  await 목록.열기();
  if ((await 목록.카드(이름).count()) === 0) return;
  await 목록.수정(이름).click();
  await 폼.삭제.waitFor();
  page.once('dialog', (창) => void 창.accept());
  await 폼.삭제.click();
  await 목록.카드(이름).waitFor({ state: 'detached' });
}

export async function qa_user2에게역할주기(page: Page, 역할이름: string): Promise<void> {
  const 상세 = new 계정상세화면(page);
  const 변경 = new 역할변경화면(page);
  await 상세.열기(await 계정번호(page, 'qa_user2'));
  await 상세.역할변경.click();
  await 변경.그려질때까지();
  await 변경.역할바꾸기(역할이름);
  await 상세.알림.글('역할이 성공적으로 변경되었습니다!').waitFor();
}

export async function 공지즉시발행(page: Page, 글: string): Promise<void> {
  const 폼 = new 공지사항폼화면(page);
  await 폼.즉시발행하기(글);
  await 폼.알림.글('공지사항이 성공적으로 발행되었습니다!').waitFor();
}

export async function 공지정리(page: Page, 글: string): Promise<void> {
  await new 공지사항화면(page).지우기(글);
}

export async function 에모지올리기(page: Page, 코드: string, 총바이트 = 0): Promise<void> {
  const 추가 = new 커스텀에모지추가화면(page);
  const 목록 = new 커스텀에모지화면(page);
  await 추가.올리기(코드, 그림만들기(총바이트));
  await 목록.알림.글('에모지가 성공적으로 생성되었습니다!').waitFor();
}

export async function 에모지정리(page: Page, ...코드들: string[]): Promise<void> {
  const 목록 = new 커스텀에모지화면(page);
  await 목록.열기();
  const 남은 = [];
  for (const 코드 of 코드들) if ((await 목록.에모지줄(코드).count()) > 0) 남은.push(코드);
  if (남은.length === 0) return;
  for (const 코드 of 남은) await 목록.선택칸(코드).check();
  page.once('dialog', (창) => void 창.accept());
  await 목록.삭제.click();
  await 목록.에모지줄(남은[0] ?? '').first().waitFor({ state: 'detached' });
}

export async function 웹훅만들기(page: Page, 주소: string, 이벤트들: string[]): Promise<void> {
  const 폼 = new 웹훅폼화면(page);
  const 상세 = new 웹훅상세화면(page);
  await 폼.열기();
  await 폼.적기(주소, 이벤트들);
  await 폼.추가제출.click();
  await 상세.그려질때까지();
}

export async function 웹훅정리(page: Page, 주소: string): Promise<void> {
  await new 웹훅화면(page).지우기(주소);
}
