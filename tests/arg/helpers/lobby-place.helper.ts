import type { GameDriver } from '@platform/kit';

import { 공통HUD, type 메뉴이름 } from '../components/hud.component.js';
import { 개수맞추기 } from './items.helper.js';
import { 로비까지, 메인메뉴로 } from './login.helper.js';

type 자리값 = { 가로: number; 세로: number };

const 로비메뉴: readonly 메뉴이름[] = ['가방', '상점', '퀘스트', '우편', '친구', '길드'];

async function 화면자리(game: GameDriver, 주소: string): Promise<자리값 | null> {
  const 찾음 = await game.find(주소);
  if (찾음 === null) return null;
  const 화면 = 찾음.screen;
  if (화면 === undefined) throw new Error(`「${주소}」의 화면 크기를 게임이 주지 않아 자리를 잴 수 없다`);
  const 사각 = 찾음.rect;
  const 가운데x = 사각 !== undefined ? 사각[0] + 사각[2] / 2 : 찾음.x;
  const 가운데y = 사각 !== undefined ? 사각[1] + 사각[3] / 2 : 찾음.y;
  if (가운데x === undefined || 가운데y === undefined) throw new Error(`「${주소}」의 화면 자리를 게임이 주지 않았다`);
  return { 가로: 가운데x / 화면[0], 세로: 1 - 가운데y / 화면[1] };
}

export async function 자리이름(game: GameDriver, 주소: string): Promise<string> {
  const 자리 = await 화면자리(game, 주소);
  if (자리 === null) return '보이지 않음';
  const 가로 = 자리.가로 < 0.4 ? '왼쪽' : 자리.가로 > 0.6 ? '오른쪽' : '가운데';
  const 세로 = 자리.세로 < 0.5 ? '위' : '아래';
  return `${가로} ${세로}`;
}

export async function 세로자리이름(game: GameDriver, 주소: string): Promise<string> {
  const 자리 = await 화면자리(game, 주소);
  if (자리 === null) return '보이지 않음';
  return 자리.세로 < 0.5 ? '위' : '아래';
}

export async function 왼쪽메뉴차례(game: GameDriver): Promise<string> {
  const 줄: { 이름: string; 세로: number }[] = [];
  for (const 이름 of 로비메뉴) {
    const 자리 = await 화면자리(game, 공통HUD.메뉴버튼(이름));
    if (자리 !== null && 자리.가로 < 0.4) 줄.push({ 이름, 세로: 자리.세로 });
  }
  return 줄
    .sort((앞, 뒤) => 앞.세로 - 뒤.세로)
    .map((칸) => 칸.이름)
    .join(' · ');
}

export async function 물약되돌리기(game: GameDriver, 아이디: string, 비밀번호: string, 앞개수: number): Promise<void> {
  await 메인메뉴로(game);
  await 로비까지(game, 아이디, 비밀번호);
  await 개수맞추기(game, '체력 물약', 앞개수);
}
