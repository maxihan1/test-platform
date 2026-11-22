import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-560',
  name: '왼쪽 위 초상화를 읽으면 던전 왼쪽 위 초상화에 내 영웅 이름이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 탱커로 혼자 던전에 들어온 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('왼쪽 위 초상화를 읽는다', async () => {
    const 던전 = await 던전화면.열림(game);
    const 이름 = await verify('초상화에 내 영웅 이름이 있다', await 던전.내이름글(), params.userId ?? '');
    const 자리 = await 화면자리읽기(game, 던전화면.내이름);
    const 왼쪽 = await verify('초상화가 화면 왼쪽에 있다', 자리.가로 < 0.5, true);
    const 위쪽 = await verify('초상화가 화면 위쪽에 있다', 자리.세로 < 0.5, true);
    await verify('왼쪽 위 초상화를 읽으면 던전 왼쪽 위 초상화에 내 영웅 이름이 보인다', 이름 && 왼쪽 && 위쪽, true);
    await verify('던전 왼쪽 위 초상화에 내 체력 막대가 보인다', await 던전.내체력막대있나(), true);
  });
});
