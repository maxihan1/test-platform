import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-056',
  name: '휴대폰의 조작 안내 창에 「화면을 눌러 이동 · 대상」 · 「적을 눌러 기본 공격」 · 「아래 버튼으로 스킬 사용」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('던전에 들어가 조작 안내 창 설명 글을 확인한다', async () => {
      const 화면 = await 던전으로(game, 아이디, 비밀번호, 0, false);
      await verify('던전에 조작 안내 창이 보인다', await 화면.뜰때까지(던전화면.조작안내), true, { blocker: true });
      const 이동 = await verify('「화면을 눌러 이동 · 대상」이 보인다', await 화면.글(던전화면.조작안내글[0] ?? ''), '화면을 눌러 이동 · 대상');
      const 공격 = await verify('「적을 눌러 기본 공격」이 보인다', await 화면.글(던전화면.조작안내글[1] ?? ''), '적을 눌러 기본 공격');
      const 스킬 = await verify('「아래 버튼으로 스킬 사용」이 보인다', await 화면.글(던전화면.조작안내글[2] ?? ''), '아래 버튼으로 스킬 사용');
      await verify('휴대폰의 조작 안내 창에 「화면을 눌러 이동 · 대상」 · 「적을 눌러 기본 공격」 · 「아래 버튼으로 스킬 사용」이 보인다', 이동 && 공격 && 스킬, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
