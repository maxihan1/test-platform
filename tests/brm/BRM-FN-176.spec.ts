import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방채우기, 서버개수 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-176',
  name: '녹슨 단검 2개가 있는 가방을 열면 녹슨 단검 줄이 둘 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검 2개를 가지고 로비에 있다'],
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
  await test.step('일반 회원이 가방에 녹슨 단검 2개를 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 2 }]);
    await verify('운영툴 캐릭터 아이템에서 녹슨 단검이 2개다', await 서버개수(admin, 나, '녹슨 단검'), 2, { blocker: true });
  });
  await test.step('가방 창을 연다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('녹슨 단검 2개가 있는 가방을 열면 녹슨 단검 줄이 둘 보인다', await 가방.이름줄수('녹슨 단검'), 2);
  });
});
