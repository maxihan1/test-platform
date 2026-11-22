import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편지급하고기다리기, 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-241',
  name: '우편 둘을 차례로 받으면 우편함 맨 위 줄이 나중에 온 우편이다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  const 먼저 = '[QA] 먼저 온 우편';
  const 나중 = '[QA] 나중에 온 우편';
  await test.step('[QA] 우편 둘을 차례로 지급하고 우편함 창을 연다', async () => {
    await 우편지급하고기다리기(admin, new 공통HUD(game), 아이디, { 제목: 먼저, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }, 1);
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목: 나중, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 2);
    await 창.줄기다리기(나중, 15_000);
    await verify('우편 둘을 차례로 받으면 우편함 맨 위 줄이 나중에 온 우편이다', (await 창.제목들())[0], 나중);
  });
});
