import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-601',
  name: '행동 막대의 버튼 안내를 읽으면 연결한 패드(PS5 · Xbox)의 버튼 그림이 버튼 안내에 뜬다',
  platforms: ['windows-ps5', 'windows-xbox'],
  precondition: ['일반 회원이 패드를 연결하고 던전에 들어와 있다'],
  held: '보류 — 패드를 바꿔도 화면 트리에 버튼 그림 오브젝트가 없다',
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원이 패드를 연결하고 던전에 들어온 것을 확인한다', async () => {
    const { type } = await game.pad();
    await verify('패드가 연결돼 있다', type === 'ps5' || type === 'xbox', true, { blocker: true });
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('행동 막대의 버튼 안내를 읽는다', async () => {
    const { type } = await game.pad();
    const 던전 = await 던전화면.열림(game);
    const 그림 = (await 던전.버튼그림(0)).toLowerCase();
    await verify('행동 막대의 버튼 안내를 읽으면 연결한 패드(PS5 · Xbox)의 버튼 그림이 버튼 안내에 뜬다', 그림.includes(type), true);
  });
});
