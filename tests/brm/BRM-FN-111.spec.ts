import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경과초, 보내고시각재기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-111',
  name: '던전 안 플레이어가 모두 쓰러지면 2.5초 뒤 결과 화면에 「다시 도전」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['move:생존 살아 있음→쓰러짐', 'move:장소 던전→결과'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    오차초: z.number().min(0).describe('걸린 시간의 허용 오차(초) — 2.5초와의 차이, 장면 불러오는 시간 포함, 0 이상').default(3),
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
  await test.step('「/gm faint」를 보낸다', async () => {
    const 던전 = await 던전화면.열기(game);
    const 시작 = await 보내고시각재기(game, '/gm faint');
    const 떴다 = await verify('쓰러진 뒤 결과 화면이 뜬다', await 던전.결과화면으로넘어갈때까지(30_000), true);
    const 걸림 = 경과초(시작);
    const 결과 = await 결과화면.열기(game, 30_000);
    const 문구 = await verify('결과 화면에 「다시 도전」이 보인다', await 결과.패배글이될때까지(), true);
    const 시간 = await verify('결과 화면이 2.5초 안팎에 뜬다', Math.abs(걸림 - 2.5) <= params.오차초, true);
    await verify('던전 안 플레이어가 모두 쓰러지면 2.5초 뒤 결과 화면에 「다시 도전」이 보인다', 떴다 && 문구 && 시간, true);
  });
});
