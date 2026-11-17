import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편제목, 우편넣기, 우편줄기다리기, 우편함비우기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-219',
  name: '첨부 없는 마지막 우편을 「삭제」하면 확인 창 없이 사라져 「받은 우편이 없습니다」가 보인다',
  held: '보류 — Test timeout of 120000ms exceeded',
  platforms: ['android'],
  precondition: ['첨부 없는 우편 1통만 있는 일반 회원이 우편함 창을 열었다', '첨부 없는 우편 2통이 있는 일반 회원이 우편함 창을 열었다'],
  techniques: ['경계값 분석'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편함을 비운 뒤 첨부 없는 우편 한 통을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 우편함비우기(game);
      await 우편넣기(admin, 아이디, 'ARG-FN-219 하나');
      await 우편줄기다리기(game, 'ARG-FN-219 하나');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「삭제」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.삭제(우편제목('ARG-FN-219 하나'));
      const 보임 = await game.waitFor(우편함창.빈우편함, { timeoutMs: 10_000 }).then(() => true, () => false);
      await verify('첨부 없는 마지막 우편을 「삭제」하면 확인 창 없이 사라져 「받은 우편이 없습니다」가 보인다', 보임, true);
    });
    await test.step('우편함 창을 닫고 첨부 없는 우편 두 통을 받아 우편함 창을 연다', async () => {
      await 우편함창.지금(game).닫기누르기();
      await 우편넣기(admin, 아이디, 'ARG-FN-219 둘A');
      await 우편넣기(admin, 아이디, 'ARG-FN-219 둘B');
      await 우편줄기다리기(game, 'ARG-FN-219 둘B');
    });
    await test.step('우편 두 통을 확인한다', async () => {
      await verify('우편함에 우편이 두 통 있다', await 우편함창.지금(game).목록.줄수(), 2, { blocker: true });
    });
    await test.step('한 통의 「삭제」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.삭제(우편제목('ARG-FN-219 둘A'));
      await 조건될때까지(async () => (await 창.목록.줄수()) === 1);
      await verify('두 통 가운데 하나를 지운 뒤에는 한 통만 남는다', await 창.목록.줄수(), 1);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
