import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편넣기, 우편줄기다리기, 우편함비우기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-215',
  name: '첨부 있는 우편이 없을 때 「모두 받기」를 누르면 「받을 첨부가 없습니다」 오류 알림이 뜬다',
  held: '보류 — 일반 회원 우편함에 받지도 지우지도 못하는 「알 수 없는 아이템」 우편 2통(ARG-FN-202 · ARG-FN-210 이 넣은 것)이 남아 우편 수 · 빈 우편함을 만들 수 없다',
  platforms: ['android'],
  precondition: ['첨부 없는 우편만 있는 일반 회원이 우편함 창을 열었다'],
  techniques: ['동등 분할'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편함을 비운 뒤 첨부 없는 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 우편함비우기(game);
      await 우편넣기(admin, 아이디, 'ARG-FN-215');
      await 우편줄기다리기(game, 'ARG-FN-215');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「모두 받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.모두받기누르기();
      const 떴다 = await 창.hud.알림기다리기('받을 첨부가 없습니다');
      await verify('첨부 있는 우편이 없을 때 「모두 받기」를 누르면 「받을 첨부가 없습니다」 오류 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
