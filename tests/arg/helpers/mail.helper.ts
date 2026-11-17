import type { GameDriver } from '@platform/kit';

import type { 우편함창 } from '../pages/mail.page.js';
import { 바탕색읽기 } from './economy.helper.js';

export async function 우편줄수(창: 우편함창): Promise<number> {
  let 개수 = 0;
  for (const 줄 of await 창.목록.줄경로들()) {
    if ((await 창.목록.줄버튼(줄, '삭제')) !== null) 개수 += 1;
  }
  return 개수;
}

export async function 받을우편제목들(창: 우편함창): Promise<string[]> {
  const 제목들: string[] = [];
  for (const 줄 of await 창.목록.줄경로들()) {
    if ((await 창.목록.줄버튼(줄, '받기')) !== null) 제목들.push((await 창.목록.칸글(줄, 0)).replace(/^● /, ''));
  }
  return 제목들;
}

export async function 첫우편제목(창: 우편함창): Promise<string> {
  for (const 줄 of await 창.목록.줄경로들()) {
    if ((await 창.목록.줄버튼(줄, '삭제')) !== null) return (await 창.목록.칸글(줄, 0)).replace(/^● /, '');
  }
  return '';
}

export async function 줄에버튼있나(창: 우편함창, 제목: string, 버튼: '받기' | '삭제'): Promise<boolean> {
  const 줄 = await 창.목록.이름줄(제목);
  if (줄 === null) return false;
  return (await 창.목록.줄버튼(줄, 버튼)) !== null;
}

export async function 안읽음표식색(game: GameDriver, 창: 우편함창, 제목: string): Promise<number[]> {
  const 주소 = await 창.칸주소(제목, 0);
  if (주소 === '') return [];
  const 찾은것 = await game.find(주소);
  const 원문 = 찾은것?.text ?? '';
  if (!원문.includes('●')) return [];
  const 태그 = /<color=#([0-9A-Fa-f]{6})[0-9A-Fa-f]{0,2}>\s*●/.exec(원문);
  if (태그 !== null) {
    const 값 = 태그[1] ?? '000000';
    return [0, 2, 4].map((자리) => parseInt(값.slice(자리, 자리 + 2), 16) / 255);
  }
  return (await game.get(주소, 'TextMeshProUGUI.color')) as number[];
}

export async function 줄바탕색(game: GameDriver, 창: 우편함창, 제목: string): Promise<number[]> {
  const 줄 = await 창.목록.이름줄(제목);
  return 줄 === null ? [] : await 바탕색읽기(game, 줄);
}

export function 보낸사람과본문이어졌나(글: string, 본문: string): boolean {
  const 꼬리 = ` · ${본문}`;
  return 글.endsWith(꼬리) && 글.length > 꼬리.length;
}
