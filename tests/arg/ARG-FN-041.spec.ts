import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터있나 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-041',
  name: '캐릭터가 없는 계정으로 처음 들어오면 서버에 그 계정의 캐릭터가 하나 생긴다',
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
    await test.step('새 계정의 캐릭터를 지운다', async () => {
      await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
    });
    await test.step('서버에 새 계정의 캐릭터가 없는지 확인한다', async () => {
      await verify('서버에 새 계정의 캐릭터가 없다', await 캐릭터있나(admin, 새아이디), false, { blocker: true });
    });

    await test.step('캐릭터가 없는 계정으로 처음 로그인한다', async () => {
      await 로비로(game, 새아이디, 새비밀번호);
      await verify('캐릭터가 없는 계정으로 처음 들어오면 서버에 그 계정의 캐릭터가 하나 생긴다', await 캐릭터있나(admin, 새아이디), true);
    });
  } finally {
    await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
  }
});
