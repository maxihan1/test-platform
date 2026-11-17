import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 보이는이름표수, 임프하나만두기 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-050',
  name: '던전의 임프 위에 이름표가 보이지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 던전에서 임프 하나를 불러냈다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 던전에서 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
      await 임프하나만두기(game);
    });
    await test.step('던전과 임프를 확인한다', async () => {
      const 화면 = 던전화면.지금(game);
      await verify('던전에 임프가 보인다', await 화면.보이나(던전화면.임프), true, { blocker: true });
      await verify('내 영웅 위에 이름표가 보인다', await 화면.뜰때까지(던전화면.이름표), true, { blocker: true });
    });

    await test.step('불러낸 임프를 확인한다', async () => {
      await verify('던전의 임프 위에 이름표가 보이지 않는다', await 보이는이름표수(game), 1);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
