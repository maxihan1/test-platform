import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { 화면자리 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

const 메뉴이름 = ['가방', '상점', '퀘스트', '우편', '친구', '길드'] as const;

export const spec = defineCase({
  tcId: 'ARG-UI-314',
  name: '로비 왼쪽 세로 줄에 메뉴 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」가 차례로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원이 탱커로 던전에 들어와 있다'],
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

    await test.step('로비 메뉴를 확인한다', async () => {
      const 자리들 = [];
      for (const 이름 of 메뉴이름) 자리들.push(await 화면자리(game, 공통HUD.메뉴버튼(이름)));
      const 가로들 = 자리들.map((자리) => 자리.가로);
      const 세로들 = 자리들.map((자리) => 자리.세로);
      const 왼쪽 = await verify('메뉴 여섯 개가 모두 화면 왼쪽에 있다', 가로들.every((가로) => 가로 < 0.5), true);
      const 세로줄 = await verify('메뉴가 가로로 퍼진 폭보다 세로로 퍼진 폭이 크다', Math.max(...가로들) - Math.min(...가로들) < Math.max(...세로들) - Math.min(...세로들), true);
      const 차례 = await verify('「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」가 위에서 아래로 차례로 있다', 세로들.every((세로, 순번) => 순번 === 0 || 세로 > (세로들[순번 - 1] ?? 0)), true);
      await verify('로비 왼쪽 세로 줄에 메뉴 「가방」 · 「상점」 · 「퀘스트」 · 「우편」 · 「친구」 · 「길드」가 차례로 보인다', 왼쪽 && 세로줄 && 차례, true);
    });

    await test.step('탱커로 던전에 들어가 조작 안내 창을 닫는다', async () => {
      await 던전으로(game, 아이디, 비밀번호, 로비화면.카드차례.탱커);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('던전 메뉴를 확인한다', async () => {
      const 자리 = await 화면자리(game, 공통HUD.메뉴);
      const 오른쪽 = await verify('메뉴가 화면 오른쪽에 있다', 자리.가로 > 0.5, true);
      const 가운데 = await verify('메뉴가 화면 위아래 가운데쯤에 있다', 자리.세로 > 0.25 && 자리.세로 < 0.75, true);
      await verify('던전에서는 메뉴가 오른쪽 가운데에 보인다', 오른쪽 && 가운데, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
