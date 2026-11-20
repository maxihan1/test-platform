import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-091',
  name: '세 번째 스킬이 없는 탱커로 던전에 들어오면 「스킬 2」 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['class:탱커'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('행동 막대의 「스킬 2」 버튼을 찾는다', async () => {
    const 던전 = await 던전화면.열기(game);
    await verify('「공격」 버튼이 떠 있다', await 던전.행동버튼뜰때까지('공격'), true, { blocker: true });
    await verify('세 번째 스킬이 없는 탱커로 던전에 들어오면 「스킬 2」 버튼이 보이지 않는다', await 던전.보임(던전화면.버튼('스킬 2')), false);
  });
});
