import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 들어온이름, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-038',
  name: '새 계정으로 처음 로그인하면 상단 바의 캐릭터 이름이 로그인 아이디다',
  platforms: ['android'],
  precondition: ['새 계정의 캐릭터를 지워 둔 상태다'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 새아이디 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('새 계정의 캐릭터를 지우고 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('새 계정으로 처음 로그인한다', async () => {
      await 로비로(game, 새아이디, 새비밀번호);
      await verify('새 계정으로 처음 로그인하면 상단 바의 캐릭터 이름이 로그인 아이디다', await 들어온이름(game), 새아이디);
    });
  } finally {
    await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
  }
});
