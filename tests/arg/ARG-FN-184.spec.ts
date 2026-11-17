import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지, 상점에서사기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-184',
  name: '상점가 3 인 「조약돌」을 팔면 1/4 을 버린 0 대신 최소 1 골드를 받는다',
  platforms: ['android'],
  precondition: ['「조약돌」을 가진 일반 회원이 가방 창을 열었다'],
  techniques: ['경계값 분석'],
  elements: ['flow:골드-판매'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「조약돌」을 사서 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 상점에서사기(game, ['조약돌']);
      await 가방창.열기(game);
    });
    await test.step('가방에 「조약돌」 줄이 있는지 확인한다', async () => {
      await verify('가방에 「조약돌」 줄이 있다', (await 가방창.지금(game).목록.이름줄('조약돌')) !== null, true, { blocker: true });
    });
    await test.step('「조약돌」 줄의 「판매」를 누른다', async () => {
      const 가방 = 가방창.지금(game);
      const 전 = await 상단바골드(game);
      await 가방.판매('조약돌');
      await 골드될때까지(game, 전 + 1);
      const 화면 = await verify('상단 바 골드가 1 오른다', (await 상단바골드(game)) - 전, 1);
      const 서버 = await verify('서버에 저장된 골드가 1 오른다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 전 + 1)).골드 - 전, 1);
      await verify('상점가 3 인 「조약돌」을 팔면 1/4 을 버린 0 대신 최소 1 골드를 받는다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
