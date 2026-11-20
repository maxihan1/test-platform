import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 떠오른글읽기, 보내고시각재기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 보스방가기, 봇모두끄기, 적모두처치 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-167',
  name: '보스를 잡으면 화면 가운데에 큰 금색 글씨 「보스 처치!」가 뜬다',
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
    await 적모두처치(game);
    await 보스방가기(game);
    await 보내고시각재기(game, '/gm killboss');
    const 글 = await 떠오른글읽기(game, 공통HUD.큰알림('보스 처치!'), 20_000);
    const 떴다 = await verify('화면 가운데에 「보스 처치!」가 뜬다', 글 !== null, true);
    const 금색 = await verify('글씨 색이 금색이다', 글?.색, '금색');
    await verify('보스를 잡으면 화면 가운데에 큰 금색 글씨 「보스 처치!」가 뜬다', 떴다 && 금색, true);
  });
});
