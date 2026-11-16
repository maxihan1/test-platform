import type { AppDriver } from '@platform/kit/app';
import { 먼저뜨는것, 뜰때까지 } from '@platform/kit/parts';

import { 대체텍스트화면 } from '../pages/alt-text.page.js';
import type { 글쓰기화면 } from '../pages/compose.page.js';

import { 키보드내리기, 파일선택기로첨부 } from './media.helper.js';

export function 긴글(글자수: number): string {
  return '가'.repeat(글자수);
}

export async function 사진붙이고기다리기(driver: AppDriver, 글쓰기: 글쓰기화면, 이름: string, 장수: number): Promise<boolean> {
  if (!(await 파일선택기로첨부(driver, 이름))) return false;
  const 붙었다 = await 글쓰기.조각수가될때까지(장수);
  await 키보드내리기(driver);
  return 붙었다;
}

export async function 대체텍스트적고돌아오기(driver: AppDriver, 글쓰기: 글쓰기화면, 글: string): Promise<boolean> {
  const 대체 = new 대체텍스트화면(driver);
  await 글쓰기.대체텍스트열기();
  if (!(await 대체.그려질때까지())) return false;
  await 대체.적기(글);
  await 대체.돌아가기();
  return 글쓰기.그려질때까지();
}

export async function 게시하고결과보기(driver: AppDriver, 글쓰기: 글쓰기화면, 실패창제목: string): Promise<'실패' | '홈' | undefined> {
  if (!(await 뜰때까지(driver, 글쓰기.게시켜짐, 30_000))) return undefined;
  await driver.$(글쓰기.게시).click();
  return 먼저뜨는것(driver, { 실패: 글쓰기.창.안의글자(실패창제목), 홈: 글쓰기.글쓰기버튼 }, 40_000);
}
