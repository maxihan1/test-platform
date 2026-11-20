import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-182',
  name: '녹슨 단검을 장착하면 「녹슨 단검 장착」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검을 가지고 로비에 있다'],
  elements: ['item:녹슨 단검'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원이 가방에 녹슨 단검을 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 녹슨 단검 줄이 있다', await 가방.이름줄수('녹슨 단검'), 1, { blocker: true });
  });
  await test.step('가방 창에서 녹슨 단검 줄의 「장착」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.줄버튼누르기(await 가방줄(가방, '녹슨 단검'), '장착');
    await verify('녹슨 단검을 장착하면 「녹슨 단검 장착」 알림이 뜬다', await hud.알림뜸('녹슨 단검 장착'), true);
  });
});
