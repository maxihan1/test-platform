import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 가방채우기, 서버골드 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-203',
  name: '알 수 없는 아이템을 팔면 골드가 10 는다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 「QA 이상한 돌」을 가지고 로비에 있다'],
  elements: ['flow:골드-판매'],
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
  await test.step('두 번째 플레이어가 「QA 이상한 돌」을 가지고 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await 가방채우기(game, admin, 둘째, [{ 이름: 'QA 이상한 돌', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「QA 이상한 돌」 줄이 있다', await 가방.이름줄수('QA 이상한 돌'), 1, { blocker: true });
  });
  await test.step('가방 창의 「QA 이상한 돌」 줄 「판매」를 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    const 전 = await 서버골드(admin, 둘째);
    await 가방.줄버튼누르기(await 가방줄(가방, 'QA 이상한 돌'), '판매');
    await 가방.줄이름사라질때까지('QA 이상한 돌');
    await hud.골드가될때까지('210 G');
    const 서버 = await verify('운영툴 캐릭터 골드가 10 늘었다', (await 서버골드(admin, 둘째)) - 전, 10);
    const 화면 = await verify('상단 바 골드가 「210 G」다', await hud.골드글(), '210 G');
    await verify('알 수 없는 아이템을 팔면 골드가 10 는다', 서버 && 화면, true);
  });
});
