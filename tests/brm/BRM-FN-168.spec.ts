import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드가넘을때까지, 보내고시각재기, 알림없음, 임프하나만두기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 레벨맞추기, 봇모두끄기, 전리품고정 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-168',
  name: '임프를 처치하면 따로 알림 없이 상단 바의 골드와 경험치만 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['monster:임프', 'rate:임프 골드', 'flow:골드-처치 보상'],
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
  await test.step('「/gm killall」 뒤 임프를 하나 불러 「/gm killall」로 처치한다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 임프하나만두기(game);
    await 레벨맞추기(game, 1);
    await 골드맞추기(game, 100);
    await 전리품고정(game, 'none');
    await verify('임프가 하나 있다', await 던전.임프있나(), true, { blocker: true });
    await 보내고시각재기(game, '/gm killall');
    const 후 = await 골드가넘을때까지(game, 100);
    const 골드 = await verify('상단 바의 골드가 바뀐다', 후 > 100, true);
    const 경험치 = await verify('상단 바의 경험치가 바뀐다', (await 던전.hud.경험치()) !== '0/100', true);
    const 알림 = await verify('따로 알림이 뜨지 않는다', await 알림없음(game, ['획득', '보스 처치']), true);
    await verify('임프를 처치하면 따로 알림 없이 상단 바의 골드와 경험치만 바뀐다', 골드 && 경험치 && 알림, true);
  });
});
