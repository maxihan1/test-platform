import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇GM값, 봇과함께던전으로, 체력앞수 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 적모두처치 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-107',
  name: '쓰러진 동료를 고르고 「부활」을 쓰면 동료가 체력 400 으로 일어난다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇과 함께 던전에 있고 봇이 쓰러져 있다'],
  elements: ['skill:부활', 'move:생존 쓰러짐→살아 있음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
  });
  let 봇 = '';
  await test.step('두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    봇 = await 봇과함께던전으로(game, driver, admin, 나, 두번째);
    await 적모두처치(game);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('두 번째 플레이어 봇을 쓰러뜨린다', async () => {
    await 봇시키기(admin, 봇, 'gm:faint');
    const 던전 = await 던전화면.열기(game);
    await verify('두 번째 플레이어 봇이 쓰러져 있다', await 던전.알림줄뜸(봇 + ' 님이 쓰러졌습니다!', 30_000), true, { blocker: true });
  });
  await test.step('동료 초상화를 누르고 「공격」을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 던전.동료고르기(1);
    await 던전.누르기('공격');
    await verify('동료가 부활한다', await 던전.새알림줄뜸(봇 + ' 님이 부활했습니다!', 40_000), true, { blocker: true });
    const 봇상태 = await 봇GM값(admin, 봇, 'stat', '직업');
    await verify('쓰러진 동료를 고르고 「부활」을 쓰면 동료가 체력 400 으로 일어난다', 체력앞수(봇상태['체력']), 400);
  });
});
