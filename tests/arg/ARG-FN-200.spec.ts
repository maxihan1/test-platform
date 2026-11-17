import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-200',
  name: '첨부를 다 받은 우편을 또 받으려 하면 「받을 첨부가 없습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['첨부 있는 우편이 1통 있는 일반 회원이 우편함 창을 열었다'],
  techniques: ['동등 분할'],
  elements: ['item:health_potion'],
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
      await 우편넣기(admin, 아이디, 'ARG-FN-200', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-200');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「받기」를 빠르게 두 번 누른다', async () => {
      const 창 = 우편함창.지금(game);
      const 줄 = await 창.목록.이름줄(우편제목('ARG-FN-200'));
      const 받기 = 줄 === null ? null : await 창.목록.줄버튼(줄, '받기');
      if (받기 === null) throw new Error('우편 줄에 「받기」 버튼이 없다');
      await game.click(받기, { count: 2, interval: 0.15 });
      const 떴다 = await 창.hud.알림기다리기('받을 첨부가 없습니다');
      await verify('첨부를 다 받은 우편을 또 받으려 하면 「받을 첨부가 없습니다」 오류 알림이 뜬다', 떴다, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
