import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지, 우편넣기, 우편받기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-182',
  name: '상점에서 팔지 않는 일반 등급 「임프의 뿔」을 팔면 기준값 40 의 1/4 인 10 골드를 받는다',
  platforms: ['android'],
  precondition: ['「임프의 뿔」을 가진 일반 회원이 가방 창을 열었다'],
  elements: ['item:imp_horn', 'flow:골드-판매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「임프의 뿔」을 받아 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-182', [{ 이름: '임프의 뿔', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-FN-182');
      await 가방창.열기(game);
    });
    await test.step('가방에 「임프의 뿔」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「임프의 뿔」 줄이 있다', (await 가방창.지금(game).목록.이름줄('임프의 뿔')) !== null, true, { blocker: true });
    });
    await test.step('「임프의 뿔」 줄의 「판매」를 누른다', async () => {
      const 가방 = 가방창.지금(game);
      const 전 = await 상단바골드(game);
      await 가방.판매('임프의 뿔');
      await 골드될때까지(game, 전 + 10);
      const 화면 = await verify('상단 바 골드가 10 오른다', (await 상단바골드(game)) - 전, 10);
      const 서버 = await verify('서버에 저장된 골드가 10 오른다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 전 + 10)).골드 - 전, 10);
      await verify('상점에서 팔지 않는 일반 등급 「임프의 뿔」을 팔면 기준값 40 의 1/4 인 10 골드를 받는다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
