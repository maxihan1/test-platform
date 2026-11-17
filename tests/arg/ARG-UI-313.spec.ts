import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 상단바레벨 } from './helpers/game-enter.helper.js';
import { 화면자리 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-313',
  name: '상단 바에 금색 「Lv.1」, 오른쪽에 「200 G」, 아래에 경험치 막대와 「0/100」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    const 로비 = 로비화면.지금(game);
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비.보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('로비 상단 바를 읽는다', async () => {
      const 레벨 = await verify('상단 바에 「Lv.1」이 보인다', await 상단바레벨(game), 1);
      const 금색 = await verify('상단 바의 「Lv.1」이 금색이다', (await game.text(공통HUD.레벨이름)).includes('<color=#FFD152>Lv.1</color>'), true);
      const 골드 = await verify('상단 바에 「200 G」가 보인다', await 로비.hud.골드글(), '200 G');
      const 레벨자리 = await 화면자리(game, 공통HUD.레벨이름);
      const 골드자리 = await 화면자리(game, 공통HUD.골드);
      const 경험치자리 = await 화면자리(game, 공통HUD.경험치);
      const 오른쪽 = await verify('「200 G」가 「Lv.1」 오른쪽에 있다', 골드자리.가로 > 레벨자리.가로, true);
      const 경험치 = await verify('경험치 막대에 「0/100」이 보인다', await 로비.hud.경험치글(), '0/100');
      const 아래 = await verify('경험치 막대가 「Lv.1」 아래에 있다', 경험치자리.세로 > 레벨자리.세로, true);
      await verify('상단 바에 금색 「Lv.1」, 오른쪽에 「200 G」, 아래에 경험치 막대와 「0/100」이 보인다', 레벨 && 금색 && 골드 && 오른쪽 && 경험치 && 아래, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
