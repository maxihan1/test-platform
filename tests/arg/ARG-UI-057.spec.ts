import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 주소사라졌나 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-057',
  name: '조작 안내 창에서 「확인」을 누르면 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원이 던전에 들어가 조작 안내 창이 떠 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0, false);
    });
    await test.step('던전에 조작 안내 창이 떠 있는지 확인한다', async () => {
      await verify('던전에 조작 안내 창이 보인다', await 던전화면.지금(game).뜰때까지(던전화면.조작안내), true, { blocker: true });
    });

    await test.step('조작 안내 창의 「확인」을 누른다', async () => {
      await 던전화면.지금(game).누르기(던전화면.조작안내확인);
      await verify('조작 안내 창에서 「확인」을 누르면 창이 닫힌다', await 주소사라졌나(game, 던전화면.조작안내), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
