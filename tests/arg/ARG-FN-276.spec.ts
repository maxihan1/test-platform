import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글이뜰때까지 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 우편보내기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-276',
  name: '열린 가방 창에서 장착하면 창이 바로 다시 그려져 무기 칸에 「녹슨 단검」이 보인다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 가진 일반 회원이 가방 창을 열었다'],
  elements: ['item:rusty_dagger'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 「녹슨 단검」을 우편으로 받아 가방 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편보내기(admin, 아이디, { 제목: '자동 시험 단검 우편', 아이템: [{ 이름: '녹슨 단검', 개수: 1 }] });
      await 로비로(game, 아이디, 비밀번호);
      const 우편함 = await 우편함창.열기(game);
      await 우편함.받기('자동 시험 단검 우편');
      await 우편함.닫기누르기();
      await 가방창.열기(game);
    });
    const 가방 = 가방창.지금(game);
    await test.step('가방에 「녹슨 단검」이 있는지 확인한다', async () => {
      await 글이뜰때까지(game, '녹슨 단검');
      await verify('가방에 「녹슨 단검」 줄이 있다', (await 가방.목록.이름줄('녹슨 단검')) !== null, true, { blocker: true });
    });

    await test.step('「녹슨 단검」을 장착한다', async () => {
      await 가방.장착('녹슨 단검');
      await game.waitFor(`${가방창.장착칸('무기')}/Label[1]/Text`, { text: '녹슨 단검', timeoutMs: 10_000 }).catch(() => undefined);
      await verify('열린 가방 창에서 장착하면 창이 바로 다시 그려져 무기 칸에 「녹슨 단검」이 보인다', (await 가방.장착칸글('무기')).includes('녹슨 단검'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
