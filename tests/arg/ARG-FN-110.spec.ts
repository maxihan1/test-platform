import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'ARG-FN-110',
  name: '새 캐릭터로 처음 들어오면 상단 바에 「Lv.1」이 보인다',
  platforms: ['android'],
  precondition: ['새 계정의 캐릭터를 지워 둔 상태다'],
  elements: ['level:1'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.newId ?? '';
  const 비밀번호 = params.newPassword ?? '';
  try {
    await test.step('새 계정의 캐릭터를 지운다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'new');
    });

    await test.step('새 계정으로 처음 로그인한다', async () => {
      await 로그인하기(game, 아이디, 비밀번호);
      const 보임 = await game.waitFor(공통HUD.레벨이름, { text: 'Lv.1', timeoutMs: 30_000 }).then(
        () => true,
        () => false,
      );
      await verify('새 캐릭터로 처음 들어오면 상단 바에 「Lv.1」이 보인다', 보임, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'new');
  }
});
