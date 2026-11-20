import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 사기 } from './helpers/items-tools.helper.js';
import { 게임다시켜기, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-609',
  name: '녹슨 단검을 산 뒤 게임을 끄고 다시 켜 로그인하면 구매 뒤 게임을 다시 켜도 녹슨 단검과 「120 G」가 남아 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['오류 추정'],
  elements: ['item:녹슨 단검', 'shop:녹슨 단검', 'flow:골드-상점 구매', 'flow:골드-시작 지급'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('녹슨 단검을 산 뒤 게임을 끄고 다시 켜 로그인한다', async () => {
    await 사기(game, '녹슨 단검');
    await hud.골드가될때까지('120 G');
    await 게임다시켜기(game, driver);
    await 로비로(game, driver, 나);
    const 가방 = await 가방창.열기(game);
    const 단검줄 = await verify('가방에 녹슨 단검 줄이 하나 남아 있다', await 가방.이름줄수('녹슨 단검'), 1);
    const 골드 = await verify('상단 바 골드가 「120 G」다', await hud.골드글(), '120 G');
    await verify('녹슨 단검을 산 뒤 게임을 끄고 다시 켜 로그인하면 구매 뒤 게임을 다시 켜도 녹슨 단검과 「120 G」가 남아 있다', 단검줄 && 골드, true);
  });
});
