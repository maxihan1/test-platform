import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 경험치글이바뀔때까지, 보스방으로 } from './helpers/battle.helper.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-118',
  name: '장비 · 파티 없이 보스 임프를 처치하면 경험치가 300 오른다',
  platforms: ['android'],
  precondition: ['레벨 20 일반 회원이 던전 보스 방에 와 있다'],
  elements: ['monster:imp_boss'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 경험치 = (글: string): number => Number(글.split('/')[0]);
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 레벨을 20 으로 올린 뒤 던전 보스 방으로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await GM(game, '/gm level 20');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 보스방으로(game);
    });
    let 처음글 = '';
    await test.step('던전과 경험치 막대를 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
      처음글 = await new 공통HUD(game).경험치글();
      await verify('상단 바에 「Lv.20」이 보인다', (await new 공통HUD(game).레벨이름글()).startsWith('Lv.20'), true, { blocker: true });
    });

    await test.step('GM 명령으로 보스 임프를 처치하고 경험치를 읽는다', async () => {
      await GM(game, '/gm killboss');
      const 나중글 = await 경험치글이바뀔때까지(game, 처음글);
      await verify('장비 · 파티 없이 보스 임프를 처치하면 경험치가 300 오른다', 경험치(나중글) - 경험치(처음글), 300);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
