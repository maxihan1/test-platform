import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방채우기, 서버개수 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-201',
  name: '게임에 없는 이름의 아이템을 우편으로 받으면 가방에 「QA 이상한 돌」이 그 이름 그대로 들어온다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
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
  await test.step('운영툴 우편으로 「QA 이상한 돌」 1개를 보내고 받는다', async () => {
    await 가방채우기(game, admin, 둘째, [{ 이름: 'QA 이상한 돌', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    const 화면 = await verify('가방 창에 「QA 이상한 돌」 줄이 하나 보인다', await 가방.이름줄수('QA 이상한 돌'), 1);
    const 서버 = await verify('운영툴 캐릭터 아이템에서 「QA 이상한 돌」이 1개다', await 서버개수(admin, 둘째, 'QA 이상한 돌'), 1);
    await verify('게임에 없는 이름의 아이템을 우편으로 받으면 가방에 「QA 이상한 돌」이 그 이름 그대로 들어온다', 화면 && 서버, true);
  });
});
