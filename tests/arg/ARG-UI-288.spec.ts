import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { GM, GM결과기다리기, 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-288',
  name: '로그인한 뒤 로비에 레벨 · 이름 · 경험치 · 골드가 든 상단 바가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원이 탱커로 던전에 들어와 있다', '일반 회원이 승리해 결과 화면에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 로비로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('로비 상단 바를 확인한다', async () => {
      const 상단 = new 공통HUD(game);
      const 바 = await verify('상단 바가 보인다', await 로비화면.지금(game).보이나(공통HUD.상단바), true);
      const 이름 = await verify('상단 바에 레벨과 이름이 보인다', /^Lv\.\d+ /.test(await 상단.레벨이름글()) && (await 상단.레벨이름글()).includes(아이디), true);
      const 경험치 = await verify('상단 바에 경험치가 보인다', /^\d+\/\d+$/.test(await 상단.경험치글()), true);
      const 골드 = await verify('상단 바에 골드가 보인다', /^\d+ G$/.test(await 상단.골드글()), true);
      await verify('로그인한 뒤 로비에 레벨 · 이름 · 경험치 · 골드가 든 상단 바가 보인다', 바 && 이름 && 경험치 && 골드, true);
    });

    await test.step('일반 회원이 탱커로 던전에 들어간다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전 상단 바를 확인한다', async () => {
      await verify('던전에서도 상단 바가 보인다', await 던전화면.지금(game).보이나(공통HUD.상단바), true);
    });

    await test.step('일반 회원이 승리해 결과 화면으로 간다', async () => {
      await GM결과기다리기(game, '/gm tp boss', '도착', 30_000);
      await GM(game, '/gm killboss');
      await 결과화면.열기(game, 60_000);
    });
    await test.step('결과 화면에서 「메인 메뉴로」를 누른다', async () => {
      await (await 결과화면.열기(game)).메인메뉴로누르기();
      await game.waitFor(로그인화면.게임시작, { timeoutMs: 30_000 }).catch(() => undefined);
      await verify('메인 메뉴로 돌아가면 상단 바가 보이지 않는다', await 로그인화면.지금(game).보이나(공통HUD.상단바), false);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
