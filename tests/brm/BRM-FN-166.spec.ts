import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 보내고시각재기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 보스방가기, 봇모두끄기, 적모두처치 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-166',
  name: '보스를 잡으면 「보스 처치! 획득」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['monster:보스 임프', 'zone:BossArena'],
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
  await test.step('「/gm killall」 뒤 「/gm tp boss」와 「/gm killboss」를 보낸다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 적모두처치(game);
    await 보스방가기(game);
    await 보내고시각재기(game, '/gm killboss');
    await 던전.hud.알림뜸('보스 처치', 20_000);
    const 알림글 = (await 던전.hud.알림글들()).find((글) => 글.includes('보스 처치')) ?? null;
    await verify('보스를 잡으면 「보스 처치! 획득」 알림이 뜬다', 알림글, '보스 처치! 획득');
  });
});
