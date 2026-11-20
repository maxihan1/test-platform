import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 떠오른글읽기, 임프하나만두기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-134',
  name: '던전에서 내가 피해를 받으면 내 머리 위로 빨간색 숫자가 떠오른다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['monster:임프'],
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
  await test.step('임프를 하나 불러 탱커를 치게 둔다', async () => {
    await 던전화면.열기(game);
    await 임프하나만두기(game);
    const 숫자 = await 떠오른글읽기(game, 던전화면.내피해숫자, 60_000);
    const 떴다 = await verify('내 머리 위에 숫자가 뜬다', 숫자 !== null, true);
    const 빨강 = await verify('숫자 색이 빨강이다', 숫자?.색, '빨강');
    await verify('던전에서 내가 피해를 받으면 내 머리 위로 빨간색 숫자가 떠오른다', 떴다 && 빨강, true);
  });
});
