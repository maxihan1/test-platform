import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 접속자에서빠질때까지 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-044',
  name: '시작 지급을 받은 계정으로 다시 들어오면 「체력 물약」이 3개 그대로다',
  platforms: ['android'],
  precondition: ['새 계정이 한 번 로그인해 시작 지급을 받았다'],
  elements: ['item:health_potion'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 새아이디 = params.newId ?? '';
  const 새비밀번호 = params.newPassword ?? '';
  try {
    await test.step('새 계정의 캐릭터를 지우고 한 번 로그인해 시작 지급을 받는다', async () => {
      await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
      await 로비로(game, 새아이디, 새비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('새 계정으로 다시 로그인한다', async () => {
      await 게임다시켜기(driver, game);
      await 접속자에서빠질때까지(admin, 새아이디);
      await 로비로(game, 새아이디, 새비밀번호);
      const 가방 = await 가방창.열기(game);
      const 줄 = await 가방.목록.이름줄('체력 물약');
      const 글 = 줄 === null ? '' : await 가방.목록.칸글(줄, 0);
      await verify('시작 지급을 받은 계정으로 다시 들어오면 「체력 물약」이 3개 그대로다', Number(/x\s*(\d+)/.exec(글)?.[1] ?? 'NaN'), 3);
    });
  } finally {
    await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
  }
});
