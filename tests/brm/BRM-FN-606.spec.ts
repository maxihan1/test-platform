import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경과초, 임프하나만두기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-606',
  name: '임프를 하나 불러 공격해 머리 위 숫자가 뜨고 사라질 때까지 재면 머리 위 숫자는 뜬 뒤 0.9초 안팎에 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['monster:임프'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    오차초: z.number().min(0).describe('걸린 시간의 허용 오차(초) — 0.9초와의 차이, 0 이상').default(2),
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
  await test.step('임프를 하나 불러 공격해 머리 위 숫자가 뜨고 사라질 때까지 잰다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 임프하나만두기(game);
    await 던전.임프고르고공격();
    const 떴다 = await verify('머리 위 숫자가 뜬다', await 던전.숫자뜰때까지(던전화면.적피해숫자), true);
    const 시작 = Date.now();
    const 사라짐 = await verify('머리 위 숫자가 사라진다', await 던전.숫자사라질때까지(던전화면.적피해숫자), true);
    const 걸림 = 경과초(시작);
    const 시간 = await verify('머리 위 숫자가 0.9초 안팎에 사라진다', Math.abs(걸림 - 0.9) <= params.오차초, true);
    await verify('임프를 하나 불러 공격해 머리 위 숫자가 뜨고 사라질 때까지 재면 머리 위 숫자는 뜬 뒤 0.9초 안팎에 사라진다', 떴다 && 사라짐 && 시간, true);
  });
});
