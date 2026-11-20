import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-171',
  name: '가방을 열면 무기 · 갑옷 · 장신구 줄에만 「장착」이 있고 체력 물약 줄에는 「장착」이 없다',
  platforms: ['android'],
  precondition: ['일반 회원이 가방에 녹슨 단검 · 가죽 갑옷 · 행운의 반지 · 체력 물약을 가지고 로비에 있다'],
  elements: ['item:녹슨 단검', 'item:가죽 갑옷', 'item:행운의 반지', 'item:체력 물약'],
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
  await test.step('일반 회원이 가방에 녹슨 단검 · 가죽 갑옷 · 행운의 반지를 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '가죽 갑옷', 개수: 1 }, { 이름: '행운의 반지', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 체력 물약 줄이 있다', await 가방.이름줄수('체력 물약'), 1, { blocker: true });
  });
  await test.step('가방 창을 열고 줄마다 버튼을 본다', async () => {
    const 가방 = await 가방창.열기(game);
    const 장착줄 = await 가방.버튼있는줄이름들('장착');
    const 있음 = await verify('무기 · 갑옷 · 장신구 줄에만 「장착」이 있다', [...장착줄].sort().join(' · '), '가죽 갑옷 · 녹슨 단검 · 행운의 반지');
    const 물약 = await verify('체력 물약 줄에는 「장착」이 없다', 장착줄.includes('체력 물약'), false);
    await verify('가방을 열면 무기 · 갑옷 · 장신구 줄에만 「장착」이 있고 체력 물약 줄에는 「장착」이 없다', 있음 && 물약, true);
  });
});
