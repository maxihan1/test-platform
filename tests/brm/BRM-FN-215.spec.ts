import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과던전으로 } from './helpers/items-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-215',
  name: '던전 메뉴의 「상점」을 누르면 던전에서도 NPC 를 찾아가지 않고 메뉴 「상점」으로 상점 창이 열린다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
  elements: ['state:장소=던전'],
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
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('일반 회원이 두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    await 봇과던전으로(game, driver, admin, 나, 둘째);
    await verify('던전 화면이 열려 있다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('던전 메뉴의 「상점」을 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await verify('던전 메뉴의 「상점」을 누르면 던전에서도 NPC 를 찾아가지 않고 메뉴 「상점」으로 상점 창이 열린다', await 상점.제목(), '상점');
  });
});
