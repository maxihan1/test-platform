import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편으로아이템받기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-195',
  name: '게임에 없는 이름의 아이템을 우편으로 받으면 그 이름 그대로 가방에 들어온다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  const 이름 = 'QA 수상한 돌';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('운영 API 로 게임에 없는 이름 「QA 수상한 돌」 아이템을 우편으로 지급하고 받는다', async () => {
    await 우편으로아이템받기(game, admin, 아이디, 이름);
    const 가방 = await 가방창.열기(game);
    const 들어옴 = await 가방.줄이생길때까지(이름);
    await 가방.닫기();
    await verify('게임에 없는 이름의 아이템을 우편으로 받으면 그 이름 그대로 가방에 들어온다', 들어옴, true);
  });
});
