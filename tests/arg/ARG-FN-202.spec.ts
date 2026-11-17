import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 기록없는우편 } from './helpers/game-state.helper.js';
import { 우편제목, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-202',
  name: '첨부 아이템을 하나도 못 찾고 골드도 없는 우편을 받으면 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['기록에 없는 첨부만 단 우편이 있는 일반 회원이 우편함 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 기록에 없는 첨부 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 기록없는우편(admin, 아이디, 비밀번호, 우편제목('ARG-FN-202'));
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-202');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.받기(우편제목('ARG-FN-202'));
      const 떴다 = await 창.hud.알림기다리기('첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요');
      await verify('첨부 아이템을 하나도 못 찾고 골드도 없는 우편을 받으면 「첨부 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
