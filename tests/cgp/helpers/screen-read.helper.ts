import type { GameDriver } from '@platform/kit';

import { 알림창 } from '../pages/alert.page.js';
import { 캐릭터선택화면, 식물이름들, type 식물이름 } from '../pages/char-select.page.js';
import { 게임가이드창 } from '../pages/guide.page.js';
import { 랭킹창 } from '../pages/leaderboard.page.js';
import { 맵선택창 } from '../pages/map-select.page.js';
import { 일시정지창 } from '../pages/pause.page.js';
import { 인원수선택창 } from '../pages/player-count.page.js';
import { 글읽기, 뜰때까지, 빠른시작버튼, 사라질때까지, 있나 } from './menu.helper.js';

export const 창경로 = (주소: string): string => 주소.replace(/^game:[^/]*/u, '');

export async function 읽기(game: GameDriver, 주소: string): Promise<string> {
  if (!(await 있나(game, 주소))) return '';
  return await 글읽기(game, 주소).catch(() => '');
}

export async function 글이바뀌었나(game: GameDriver, 주소: string, 앞: string, 한도ms: number): Promise<boolean> {
  const 끝 = Date.now() + 한도ms;
  for (;;) {
    const 지금 = await 읽기(game, 주소);
    if (지금 !== '' && 지금 !== 앞) return true;
    if (Date.now() >= 끝) return false;
  }
}

export async function 인원수창읽기(game: GameDriver): Promise<{ 제목: string; 버튼: Record<'1P' | '2P' | '3P' | '4P', string> }> {
  const 창 = await 인원수선택창.기다리기(game).catch(() => null);
  if (창 === null) return { 제목: '', 버튼: { '1P': '', '2P': '', '3P': '', '4P': '' } };
  return {
    제목: await 읽기(game, 인원수선택창.제목),
    버튼: {
      '1P': await 창.버튼글('1P').catch(() => ''),
      '2P': await 창.버튼글('2P').catch(() => ''),
      '3P': await 창.버튼글('3P').catch(() => ''),
      '4P': await 창.버튼글('4P').catch(() => ''),
    },
  };
}

export async function 알림창읽기(알림: 알림창 | null): Promise<{ 제목: string; 내용: string; 취소: string; 확인: string }> {
  if (알림 === null) return { 제목: '', 내용: '', 취소: '', 확인: '' };
  const 읽 = async (주소: string): Promise<string> => await 알림.글(주소).catch(() => '');
  return {
    제목: await 읽(알림창.제목),
    내용: await 읽(알림창.내용),
    취소: await 읽(`${알림창.취소}/text`),
    확인: await 읽(`${알림창.확인}/text`),
  };
}

export async function 알림창닫기(game: GameDriver): Promise<void> {
  if (!(await 있나(game, 알림창.내용))) return;
  await game.click(알림창.취소);
  await 사라질때까지(game, 알림창.내용, 5_000);
}

export async function 조작안내읽기(선택: 캐릭터선택화면): Promise<{ 캐릭터선택: string; 이동: string; 자세히: string; 선택: string; 취소: string }> {
  const 줄 = (await 선택.조작안내글().catch(() => '')).split(' · ');
  return { 캐릭터선택: 줄[0] ?? '', 이동: 줄[1] ?? '', 자세히: 줄[2] ?? '', 선택: 줄[3] ?? '', 취소: 줄[4] ?? '' };
}

export async function 고르기창읽기(
  game: GameDriver,
  선택: 캐릭터선택화면,
): Promise<{ 식물수: number; 이름: string; 첫태그: string; 둘째태그: string; 데미지: string; 사거리: string; 공격속도: string }> {
  let 식물수 = 0;
  for (const 칸 of ['Line1/1', 'Line1/2', 'Line1/3', 'Line2/1', 'Line2/2']) {
    if (await 있나(game, `${캐릭터선택화면.고르기창}/${칸}`)) 식물수 += 1;
  }
  const 식물 = await 선택.고르기창식물().catch(() => ({ 이름: '', 태그: '', 능력: '' }));
  const 태그 = 식물.태그.split(' · ');
  const 능력 = 식물.능력.split(' · ');
  return { 식물수, 이름: 식물.이름, 첫태그: 태그[0] ?? '', 둘째태그: 태그[1] ?? '', 데미지: 능력[0] ?? '', 사거리: 능력[1] ?? '', 공격속도: 능력[2] ?? '' };
}

export async function 칸식물될때까지(선택: 캐릭터선택화면, 칸: 1 | 2 | 3, 기대: 식물이름 | '빈칸', 한도ms = 3_000): Promise<식물이름 | '빈칸'> {
  const 끝 = Date.now() + 한도ms;
  let 지금 = await 선택.칸식물(칸);
  while (지금 !== 기대 && Date.now() < 끝) 지금 = await 선택.칸식물(칸);
  return 지금;
}

export async function 첫칸에첫식물넣기(game: GameDriver, 선택: 캐릭터선택화면): Promise<void> {
  if (await 있나(game, 캐릭터선택화면.고르기창)) await 선택.고르기창에서고르기(0);
  await 선택.칸채우기([식물이름들[0]]);
}

export async function 칸하나비우기(선택: 캐릭터선택화면): Promise<boolean> {
  await 선택.칸옮기기('LeftArrow', 3);
  const 칸들 = [await 선택.칸식물(1), await 선택.칸식물(2), await 선택.칸식물(3)];
  if (칸들.includes('빈칸')) return true;
  const 첫 = 칸들[0];
  if (첫 === undefined || 첫 === '빈칸') return false;
  await 선택.칸옮기기('RightArrow', 1);
  if (await 선택.고르기창열기()) await 선택.고르기창에서고르기(식물이름들.indexOf(첫));
  return (await 칸식물될때까지(선택, 1, '빈칸')) === '빈칸';
}

export async function 맵선택읽기(
  game: GameDriver,
): Promise<{ 제목: string; 맵이름: string; 크기: string; 난이도: string; 왼쪽: boolean; 오른쪽: boolean; 랭킹: string }> {
  const 창 = await 맵선택창.기다리기(game).catch(() => null);
  if (창 === null) return { 제목: '', 맵이름: '', 크기: '', 난이도: '', 왼쪽: false, 오른쪽: false, 랭킹: '' };
  const 읽 = async (주소: string): Promise<string> => await 창.글(주소).catch(() => '');
  return {
    제목: await 읽(맵선택창.제목),
    맵이름: await 읽(맵선택창.맵이름),
    크기: await 읽(맵선택창.크기),
    난이도: await 읽(맵선택창.난이도),
    왼쪽: await 창.보이나(맵선택창.왼쪽),
    오른쪽: await 창.보이나(맵선택창.오른쪽),
    랭킹: await 읽(맵선택창.랭킹글),
  };
}

export async function 랭킹창읽기(game: GameDriver): Promise<{ 제목: string; 맵이름: string; 인원탭: string[]; 내기록: string }> {
  const 창 = await 랭킹창.기다리기(game).catch(() => null);
  if (창 === null) return { 제목: '', 맵이름: '', 인원탭: ['', '', '', ''], 내기록: '' };
  const 읽 = async (주소: string): Promise<string> => await 창.글(주소).catch(() => '');
  const 탭 = (await 창.인원탭글().catch(() => '')).split(' · ');
  return {
    제목: await 읽(랭킹창.제목),
    맵이름: await 읽(랭킹창.맵이름),
    인원탭: [탭[0] ?? '', 탭[1] ?? '', 탭[2] ?? '', 탭[3] ?? ''],
    내기록: await 읽(랭킹창.내기록),
  };
}

export async function 일시정지창뜨나(game: GameDriver): Promise<boolean> {
  return await 일시정지창.열기(game).then(
    () => true,
    () => false,
  );
}

export async function 일시정지버튼읽기(game: GameDriver): Promise<{ 열림: boolean; 글: Record<keyof typeof 일시정지창.버튼, string> }> {
  const 창 = await 일시정지창.열기(game).catch(() => null);
  const 읽 = async (이름: keyof typeof 일시정지창.버튼): Promise<string> => (창 === null ? '' : await 창.버튼글(이름).catch(() => ''));
  return {
    열림: 창 !== null,
    글: { 돌아가기: await 읽('돌아가기'), '게임 가이드': await 읽('게임 가이드'), 환경설정: await 읽('환경설정'), 로비: await 읽('로비'), 메인메뉴: await 읽('메인메뉴') },
  };
}

export async function 가이드장제목들(game: GameDriver): Promise<string[]> {
  const 가이드 = await 게임가이드창.기다리기(game).catch(() => null);
  const 줄 = 가이드 === null ? [] : (await 가이드.장제목들().catch(() => '')).split(' · ');
  return Array.from({ length: 7 }, (_, 번) => 줄[번] ?? '');
}

export async function 튜토리얼이어지나(game: GameDriver, 장면: string): Promise<boolean> {
  return await 뜰때까지(game, 장면, 5_000);
}

export async function 메인메뉴로갔나(game: GameDriver): Promise<boolean> {
  return await 뜰때까지(game, 빠른시작버튼, 30_000);
}

export async function 캐릭터선택으로갔나(game: GameDriver): Promise<boolean> {
  return await 캐릭터선택화면.기다리기(game).then(
    () => true,
    () => false,
  );
}
