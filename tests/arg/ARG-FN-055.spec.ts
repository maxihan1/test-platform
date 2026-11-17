import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 우편보내기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-055',
  name: '우편 첨부를 받으면 10초 주기를 기다리지 않고 서버에 늘어난 골드가 저장된다',
  platforms: ['android'],
  precondition: ['일반 회원에게 골드 100 을 첨부한 우편을 보내 두었다'],
  elements: ['flow:골드-우편'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 골드 100 을 첨부한 우편을 보낸 뒤 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편보내기(admin, 아이디, { 제목: '자동 시험 골드 우편', 골드: 100 });
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('우편함에서 「받기」를 누른다', async () => {
      const 우편함 = await 우편함창.열기(game);
      await 우편함.받기('자동 시험 골드 우편');
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 값.골드 === 300, 5_000);
      await verify('우편 첨부를 받으면 10초 주기를 기다리지 않고 서버에 늘어난 골드가 저장된다', 서버.골드, 300);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
