import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-042',
  name: '새 계정으로 처음 들어오면 골드가 「200 G」다',
  platforms: ['android'],
  precondition: ['새 계정의 캐릭터를 지워 둔 상태다'],
  elements: ['flow:골드-시작지급'],
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

    await test.step('새 계정으로 처음 로그인해 골드를 읽는다', async () => {
      await 로비로(game, 새아이디, 새비밀번호);
      const 화면골드 = await verify('상단 바 골드가 「200 G」다', await new 공통HUD(game).골드글(), '200 G');
      const 서버골드 = await verify('서버에 저장된 골드가 200 이다', (await 캐릭터(admin, 새아이디)).골드, 200);
      await verify('새 계정으로 처음 들어오면 골드가 「200 G」다', 화면골드 && 서버골드, true);
    });
  } finally {
    await 계정되돌리기(admin, 새아이디, 새비밀번호, 'new');
  }
});
