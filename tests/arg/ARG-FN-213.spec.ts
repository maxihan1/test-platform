import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편넣기, 우편줄기다리기, 우편함비우기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-213',
  name: '「모두 받기」를 누르면 첨부가 남은 우편 2통을 받아 받기 알림이 두 번 뜬다',
  platforms: ['android'],
  precondition: ['첨부 있는 우편이 2통 있는 일반 회원이 우편함 창을 열었다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편함을 비운 뒤 첨부 있는 우편 두 통을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 우편함비우기(game);
      await 우편넣기(admin, 아이디, 'ARG-FN-213 하나', [{ 이름: '체력 물약', 개수: 1 }]);
      await 우편넣기(admin, 아이디, 'ARG-FN-213 둘', [{ 이름: '체력 물약', 개수: 1 }]);
      await 우편줄기다리기(game, 'ARG-FN-213 둘');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「모두 받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.모두받기누르기();
      const 받음글 = async (): Promise<number> => (await 창.hud.알림글들()).filter((글) => 글.startsWith('받음')).length;
      await 조건될때까지(async () => (await 받음글()) >= 2);
      await verify('「모두 받기」를 누르면 첨부가 남은 우편 2통을 받아 받기 알림이 두 번 뜬다', await 받음글(), 2);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
