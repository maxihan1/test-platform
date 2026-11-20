import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기, 적모두처치 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-105',
  name: '체력이 0 이 되면 죽지 않고 쓰러져 「/gm stat」 체력이 「0/1200」이다',
  platforms: ['android'],
  precondition: ['일반 회원이 두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
  elements: ['class:탱커', 'move:생존 살아 있음→쓰러짐'],
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
  await test.step('두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    await 봇과함께던전으로(game, driver, admin, 나, 두번째);
    await 적모두처치(game);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm faint」를 보낸다', async () => {
    await 쓰러뜨리기(game);
    const 상태 = await GM상태(game);
    await verify('체력이 0 이 되면 죽지 않고 쓰러져 「/gm stat」 체력이 「0/1200」이다', 상태['체력'], '0/1200');
  });
});
