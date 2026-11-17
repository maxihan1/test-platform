import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 내가길드만들기, 토스트떴나 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-343',
  name: '마지막 1명이 탈퇴하면 길드가 없어져 길드 창에 「아직 길드가 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 혼자인 길드가 있고 일반 회원이 길드 창을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 길드이름 = '시험길드343';
  try {
    await test.step('일반 회원이 혼자 길드를 만들고 길드 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 골드맞추기(game, 1000);
      await 내가길드만들기(game, 길드이름);
      await 길드창.열기(game);
    });
    await test.step('길드 창이 열렸는지 확인한다', async () => {
      await verify('길드 창이 열려 있다', await 길드창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('「길드 탈퇴」를 누른다', async () => {
      const 창 = 길드창.지금(game);
      await 창.탈퇴누르기();
      await verify('마지막 1명이 탈퇴하면 길드가 없어져 길드 창에 「아직 길드가 없습니다」가 보인다', await 창.길드없음안내뜰때까지(), true);
    });
    await test.step('탈퇴한 뒤 같은 이름으로 다시 만든다', async () => {
      const 창 = 길드창.지금(game);
      await 창.만들기(길드이름);
      await verify('없어진 길드와 같은 이름으로 다시 만들 수 있다', await 토스트떴나(game, '길드 창설 완료'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
