import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이던전에있을때까지 } from './helpers/dungeon-tools.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-117',
  name: '던전이 진행 중일 때 로그인하면 로비를 거치지 않고 바로 던전 화면이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 던전에 들어가 있다'],
  elements: ['move:장소 로비→던전'],
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
  await test.step('두 번째 플레이어 봇이 던전에 들어간다', async () => {
    봇 = await 봇켜기(admin, 두번째);
    await 봇시키기(admin, 봇, 'seat:2');
    await 봇시키기(admin, 봇, 'ready');
    await verify('두 번째 플레이어 봇이 던전에 들어가 있다', await 봇이던전에있을때까지(admin, 봇), true, { blocker: true });
  });
  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(game, driver, 나);
    const 던전 = new 던전화면(game);
    await verify('던전이 진행 중일 때 로그인하면 로비를 거치지 않고 바로 던전 화면이 보인다', await 던전.행동버튼뜰때까지('공격', 90_000), true);
  });
});
