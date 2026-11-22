import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비HUD금색레벨인가, 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-505',
  name: '상단 바를 읽으면 상단 바에 「Lv.」 뒤 레벨이 금색으로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('상단 바를 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 레벨글 = await 로비.hud.레벨이름();
    const 레벨있음 = await verify('상단 바에 「Lv.」 뒤 레벨이 있다', 색글떼기(레벨글).startsWith('Lv.'), true);
    const 금색 = await verify('「Lv.」 뒤 레벨이 금색이다', 로비HUD금색레벨인가(레벨글), true);
    await verify('상단 바를 읽으면 상단 바에 「Lv.」 뒤 레벨이 금색으로 보인다', 레벨있음 && 금색, true);
    const 골드끝 = await verify('골드 글이 「 G」로 끝난다', (await 로비.hud.골드글()).endsWith(' G'), true);
    const 레벨자리 = await 화면자리읽기(game, 공통HUD.레벨이름주소);
    const 골드자리 = await 화면자리읽기(game, 공통HUD.골드주소);
    const 오른쪽 = await verify('골드가 레벨 글보다 오른쪽에 있다', 골드자리.가로 > 레벨자리.가로, true);
    await verify('상단 바 오른쪽에 「 G」로 끝나는 골드가 보인다', 골드끝 && 오른쪽, true);
    const 막대 = await verify('경험치 막대가 보인다', (await game.find(공통HUD.경험치막대주소)) !== null, true);
    const 막대자리 = await 화면자리읽기(game, 공통HUD.경험치막대주소);
    const 아래 = await verify('경험치 막대가 레벨 글보다 아래에 있다', 막대자리.세로 > 레벨자리.세로, true);
    const 경험치글 = await verify('경험치 글이 「/」로 이어져 있다', (await 로비.hud.경험치글()).includes('/'), true);
    await verify('상단 바 아래에 경험치 막대와 「/」로 이은 경험치 글이 보인다', 막대 && 아래 && 경험치글, true);
  });
});
