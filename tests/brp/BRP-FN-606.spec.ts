import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-606',
  name: '던전 왼쪽 위 내 초상화를 누르면 내 영웅에 대상 표시(고리)가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
  elements: ['zone:DungeonStart'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 탱커로 던전에 들어간다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    const 던전 = await 던전입장(game, '탱커');
    await verify('초상화를 누르기 전에는 대상 표시가 없다', await 던전.대상표시있나(), false, { blocker: true });
  });

  await test.step('던전 왼쪽 위 내 초상화를 누른다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.내초상화누르기();
    await verify('던전 왼쪽 위 내 초상화를 누르면 내 영웅에 대상 표시(고리)가 뜬다', await 던전.대상표시뜰때까지(), true);
  });
});
