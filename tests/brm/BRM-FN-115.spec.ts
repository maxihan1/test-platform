import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경과초 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기 } from './helpers/game-state.helper.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-115',
  name: '결과 화면에서 기다리면 결과 화면이 뜨고 12초 뒤 로비 화면이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 결과 화면에 와 있다'],
  elements: ['move:장소 결과→로비', 'zone:PostGame'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    오차초: z.number().min(0).describe('걸린 시간의 허용 오차(초) — 12초와의 차이, 0 이상').default(2),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  let 결과뜬시각 = 0;
  await test.step('일반 회원이 결과 화면까지 간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await 쓰러뜨리기(game);
    await 결과화면.열기(game, 60_000);
    결과뜬시각 = Date.now();
    await verify('결과 화면이 보인다', await 지금화면(game), '결과', { blocker: true });
  });
  await test.step('결과 화면에서 기다린다', async () => {
    const 결과 = await 결과화면.열기(game, 30_000);
    const 로비 = await verify('결과 화면 뒤 로비 화면이 보인다', await 결과.로비로돌아갈때까지(40_000), true);
    const 걸림 = 경과초(결과뜬시각);
    const 시간 = await verify('로비 화면이 12초 안팎에 보인다', Math.abs(걸림 - 12) <= params.오차초, true);
    await verify('결과 화면에서 기다리면 결과 화면이 뜨고 12초 뒤 로비 화면이 보인다', 로비 && 시간, true);
  });
});
