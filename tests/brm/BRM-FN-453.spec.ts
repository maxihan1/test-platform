import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-453',
  name: '띄어쓰기가 다른 이름 「체력물약」으로 지급하면 알 수 없는 아이템이 되어 가방에 「체력물약」이 따로 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
  techniques: ['동등 분할'],
  elements: ['item:체력 물약'],
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
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('운영툴 우편으로 아이템 이름 「체력물약」(띄어쓰기 없음) 1개를 보내고 받는다', async () => {
    await 가방채우기(game, admin, 둘째, [{ 이름: '체력물약', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    const 따로 = await verify('가방 창에 「체력물약」 줄이 하나 따로 보인다', await 가방.이름줄수('체력물약'), 1);
    const 원래 = await verify('가방 창에 「체력 물약 x3」 줄이 그대로 있다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x3');
    await verify('띄어쓰기가 다른 이름 「체력물약」으로 지급하면 알 수 없는 아이템이 되어 가방에 「체력물약」이 따로 보인다', 따로 && 원래, true);
  });
});
