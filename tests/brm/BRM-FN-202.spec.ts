import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방줄, 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-202',
  name: '가방 창의 「QA 이상한 돌」 줄 설명을 읽으면 알 수 없는 아이템 줄의 설명은 「알 수 없는 아이템」이다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 「QA 이상한 돌」을 가지고 로비에 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어가 「QA 이상한 돌」을 가지고 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await 가방채우기(game, admin, 둘째, [{ 이름: 'QA 이상한 돌', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「QA 이상한 돌」 줄이 있다', await 가방.이름줄수('QA 이상한 돌'), 1, { blocker: true });
  });
  await test.step('가방 창의 「QA 이상한 돌」 줄 설명을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('가방 창의 「QA 이상한 돌」 줄 설명을 읽으면 알 수 없는 아이템 줄의 설명은 「알 수 없는 아이템」이다', await 가방.줄설명(await 가방줄(가방, 'QA 이상한 돌')), '알 수 없는 아이템');
  });
});
