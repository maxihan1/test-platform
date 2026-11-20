import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 서버개수, 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 지급회수 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-282',
  name: '운영툴로 그 지급을 회수하고 가방을 열면 이미 받은 첨부를 운영툴이 회수해도 가방의 체력 물약은 그대로다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 우편 첨부 체력 물약을 받았다'],
  elements: ['item:체력 물약'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 지급번호 = 0;
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어가 우편 첨부 체력 물약을 받는다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함, 번호들 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 282', 아이템: [{ 이름: '체력 물약', 개수: 1 }] }]);
    지급번호 = 번호들[0] ?? 0;
    await 함.받기(0);
    await hud.알림뜸('받음');
    await verify('운영툴 캐릭터 아이템에서 체력 물약이 4개다', await 서버개수(admin, 둘째, '체력 물약'), 4, { blocker: true });
  });
  await test.step('운영툴로 그 지급을 회수하고 가방을 연다', async () => {
    await 지급회수(admin, 지급번호);
    const 가방 = await 가방창.열기(game);
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 4개 그대로다', await 서버개수(admin, 둘째, '체력 물약'), 4);
    const 화면 = await verify('가방 창에 「체력 물약 x4」가 그대로 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x4');
    await verify('운영툴로 그 지급을 회수하고 가방을 열면 이미 받은 첨부를 운영툴이 회수해도 가방의 체력 물약은 그대로다', 서버 && 화면, true);
  });
});
