import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방줄, 가방채우기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-236',
  name: '가방 창의 판매 버튼 글을 읽으면 판매가는 상점가의 1/4 버림이라 녹슨 단검 「판매 20G」 · 강철 롱소드 「판매 87G」 · 룬 새김 도끼 「판매 225G」다',
  platforms: ['android'],
  precondition: ['일반 회원이 녹슨 단검 · 강철 롱소드 · 룬 새김 도끼를 가지고 로비에 있다'],
  elements: ['item:녹슨 단검', 'item:강철 롱소드', 'item:룬 새김 도끼', 'flow:골드-판매'],
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
  await test.step('일반 회원이 가방에 녹슨 단검 · 강철 롱소드 · 룬 새김 도끼를 갖춘다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '녹슨 단검', 개수: 1 }, { 이름: '강철 롱소드', 개수: 1 }, { 이름: '룬 새김 도끼', 개수: 1 }]);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 룬 새김 도끼 줄이 있다', await 가방.이름줄수('룬 새김 도끼'), 1, { blocker: true });
  });
  await test.step('가방 창의 판매 버튼 글을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 단검 = await verify('녹슨 단검 줄의 판매 버튼 글이 「판매 20G」다', await 가방.판매버튼글(await 가방줄(가방, '녹슨 단검')), '판매 20G');
    const 롱소드 = await verify('강철 롱소드 줄의 판매 버튼 글이 「판매 87G」다', await 가방.판매버튼글(await 가방줄(가방, '강철 롱소드')), '판매 87G');
    const 도끼 = await verify('룬 새김 도끼 줄의 판매 버튼 글이 「판매 225G」다', await 가방.판매버튼글(await 가방줄(가방, '룬 새김 도끼')), '판매 225G');
    await verify('가방 창의 판매 버튼 글을 읽으면 판매가는 상점가의 1/4 버림이라 녹슨 단검 「판매 20G」 · 강철 롱소드 「판매 87G」 · 룬 새김 도끼 「판매 225G」다', 단검 && 롱소드 && 도끼, true);
  });
});
