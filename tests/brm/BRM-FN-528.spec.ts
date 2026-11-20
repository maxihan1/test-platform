import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방줄, 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-528',
  name: '가방 창의 줄마다 버튼을 보면 「사용」 버튼은 체력 물약 줄에만 있다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검 · 임프의 뿔 · 체력 물약을 가지고 로비에 있다'],
  elements: ['item:녹슨 단검', 'item:임프의 뿔', 'item:체력 물약'],
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
  await test.step('일반 회원이 가방에 녹슨 단검 · 임프의 뿔을 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '임프의 뿔', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 임프의 뿔 줄이 있다', await 가방.이름줄수('임프의 뿔'), 1, { blocker: true });
  });
  await test.step('가방 창의 줄마다 버튼을 본다', async () => {
    const 가방 = await 가방창.열기(game);
    const 물약 = await verify('체력 물약 줄에 「사용」 버튼이 있다', await 가방.줄버튼있나(await 가방줄(가방, '체력 물약'), '사용'), true);
    const 단검 = await verify('녹슨 단검 줄에 「사용」 버튼이 없다', await 가방.줄버튼있나(await 가방줄(가방, '녹슨 단검'), '사용'), false);
    const 뿔 = await verify('임프의 뿔 줄에 「사용」 버튼이 없다', await 가방.줄버튼있나(await 가방줄(가방, '임프의 뿔'), '사용'), false);
    await verify('가방 창의 줄마다 버튼을 보면 「사용」 버튼은 체력 물약 줄에만 있다', 물약 && 단검 && 뿔, true);
  });
});
