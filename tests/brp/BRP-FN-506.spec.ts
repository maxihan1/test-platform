import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 메뉴이름 } from './components/hud.component.js';
import { 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-506',
  name: '메뉴 버튼 차례를 읽으면 메뉴 버튼이 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」 차례로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('메뉴 버튼 차례를 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 차례: 메뉴이름[] = ['가방', '상점', '퀘스트', '우편', '친구', '길드'];
    const 글들: string[] = [];
    const 세로들: number[] = [];
    for (const 이름 of 차례) {
      글들.push(await 로비.hud.메뉴글(이름));
      세로들.push((await 화면자리읽기(game, 로비.hud.메뉴버튼(이름))).세로);
    }
    const 글 = await verify('메뉴 버튼 글이 가방 · 상점 · 퀘스트 · 우편 · 친구 · 길드 차례다', 글들.join(' · '), '가방 · 상점 · 퀘스트 · 우편 · 친구 · 길드');
    const 위에서아래 = await verify('메뉴 버튼이 위에서 아래로 놓여 있다', 세로들.every((값, i) => i === 0 || 값 > (세로들[i - 1] ?? 0)), true);
    await verify('메뉴 버튼 차례를 읽으면 메뉴 버튼이 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」 차례로 보인다', 글 && 위에서아래, true);
  });
});
