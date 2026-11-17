import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 저장될때까지 } from './helpers/game-state.helper.js';
import { 골드될때까지, 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-205',
  name: '「받기」에 성공하면 첨부 「체력 물약」이 가방에 더해진다',
  platforms: ['android'],
  smoke: true,
  precondition: ['「체력 물약」 2개와 골드 100 을 첨부한 우편이 있는 일반 회원이 우편함 창을 열었다'],
  elements: ['item:health_potion', 'flow:골드-우편'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-205', [{ 이름: '체력 물약', 개수: 2 }], 100);
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-205');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      const 전 = await 상단바골드(game);
      await 창.받기(우편제목('ARG-FN-205'));
      await 골드될때까지(game, 전 + 100);
      await 창.닫기누르기();
      const 가방 = await 가방창.열기(game);
      await verify('「받기」에 성공하면 첨부 「체력 물약」이 가방에 더해진다', await 가방.줄칸글('체력 물약', 0), '체력 물약 x5');
      const 화면 = await verify('상단 바 골드가 100 오른다', (await 상단바골드(game)) - 전, 100);
      const 서버 = await verify('서버에 저장된 골드가 100 오른다', (await 저장될때까지(admin, 아이디, (값) => 값.골드 === 전 + 100)).골드 - 전, 100);
      await verify('첨부 골드 100 이 보유 골드에 더해진다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
