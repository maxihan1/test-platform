import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-045',
  name: '레벨이 31 인 캐릭터를 불러오면 상단 바에 「Lv.30」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 캐릭터 레벨을 31 로 바꿔 두었다'],
  elements: ['level:30'],
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
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 캐릭터 레벨을 31 로 바꿔 두고 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'raw', { level: 31 });
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('레벨이 31 인 캐릭터로 로그인한다', async () => {
      await 로비로(game, 아이디, 비밀번호);
      await verify('레벨이 31 인 캐릭터를 불러오면 상단 바에 「Lv.30」이 보인다', (await new 공통HUD(game).레벨이름글()).includes('Lv.30'), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
