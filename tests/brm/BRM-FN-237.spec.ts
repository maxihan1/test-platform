import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방줄, 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-237',
  name: '가방 창의 판매 버튼 글을 읽으면 상점에서 팔지 않는 아이템의 판매가는 등급 기준값의 1/4 이라 임프의 뿔 「판매 10G」 · 보스의 왕관 조각 「판매 200G」 · 불꽃의 검 「판매 500G」다',
  platforms: ['android'],
  precondition: ['일반 회원이 임프의 뿔 · 보스의 왕관 조각 · 불꽃의 검을 가지고 로비에 있다'],
  elements: ['item:임프의 뿔', 'item:보스의 왕관 조각', 'item:불꽃의 검', 'flow:골드-판매'],
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
  await test.step('일반 회원이 가방에 임프의 뿔 · 보스의 왕관 조각 · 불꽃의 검을 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '임프의 뿔', 개수: 1 }, { 이름: '보스의 왕관 조각', 개수: 1 }, { 이름: '불꽃의 검', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 불꽃의 검 줄이 있다', await 가방.이름줄수('불꽃의 검'), 1, { blocker: true });
  });
  await test.step('가방 창의 판매 버튼 글을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 뿔 = await verify('임프의 뿔 줄의 판매 버튼 글이 「판매 10G」다', await 가방.판매버튼글(await 가방줄(가방, '임프의 뿔')), '판매 10G');
    const 조각 = await verify('보스의 왕관 조각 줄의 판매 버튼 글이 「판매 200G」다', await 가방.판매버튼글(await 가방줄(가방, '보스의 왕관 조각')), '판매 200G');
    const 검 = await verify('불꽃의 검 줄의 판매 버튼 글이 「판매 500G」다', await 가방.판매버튼글(await 가방줄(가방, '불꽃의 검')), '판매 500G');
    await verify('가방 창의 판매 버튼 글을 읽으면 상점에서 팔지 않는 아이템의 판매가는 등급 기준값의 1/4 이라 임프의 뿔 「판매 10G」 · 보스의 왕관 조각 「판매 200G」 · 불꽃의 검 「판매 500G」다', 뿔 && 조각 && 검, true);
  });
});
