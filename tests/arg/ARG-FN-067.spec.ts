import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 버튼글기다려읽기, 항아리하나두기 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-067',
  name: '휴대폰에서 던전의 항아리를 누르면 그 항아리를 골라 「공격」 버튼이 「들기」로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원이 던전에서 항아리 하나를 불러냈다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 항아리 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 항아리하나두기(game);
    });
    await test.step('던전과 항아리를 확인한다', async () => {
      await verify('던전에 항아리가 보인다', await 던전화면.지금(game).보이나(던전화면.항아리), true, { blocker: true });
    });

    await test.step('불러낸 항아리를 누른다', async () => {
      await 던전화면.지금(game).누르기(던전화면.항아리);
      await verify('휴대폰에서 던전의 항아리를 누르면 그 항아리를 골라 「공격」 버튼이 「들기」로 바뀐다', await 버튼글기다려읽기(game, 던전화면.공격, '들기'), '들기');
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
