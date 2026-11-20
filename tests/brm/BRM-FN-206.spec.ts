import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기, GM상태 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-206',
  name: '골드 80 으로 80 골드짜리 녹슨 단검을 사면 골드가 0 이 되고 음수가 되지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:녹슨 단검', 'shop:녹슨 단검', 'flow:골드-상점 구매'],
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
  await test.step('「/gm gold 80」 뒤 녹슨 단검을 사고 「/gm stat」 첫 줄의 골드를 읽는다', async () => {
    await 골드맞추기(game, 80);
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '녹슨 단검'));
    await hud.골드가될때까지('0 G');
    const 상태 = await GM상태(game);
    const 스탯 = await verify('「/gm stat」 골드가 0 이다', 상태['골드'], '0');
    const 화면 = await verify('상단 바 골드가 「0 G」다', await hud.골드글(), '0 G');
    await verify('골드 80 으로 80 골드짜리 녹슨 단검을 사면 골드가 0 이 되고 음수가 되지 않는다', 스탯 && 화면, true);
  });
});
