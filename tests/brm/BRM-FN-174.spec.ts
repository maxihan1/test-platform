import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 가방채우기, 서버개수가될때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-174',
  name: '체력 물약 30개를 우편으로 받은 뒤 가방 창을 열면 아이템이 30개 넘게 있어도 가방 창이 모두 받아 「체력 물약 x33」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:체력 물약'],
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
  await test.step('체력 물약 30개를 우편으로 받은 뒤 가방 창을 연다', async () => {
    await 가방채우기(game, admin, 나, [{ 이름: '체력 물약', 개수: 30 }]);
    const 가방 = await 가방창.열기(game);
    const 화면 = await verify('가방 창에 「체력 물약 x33」이 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x33');
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 33개다', await 서버개수가될때까지(admin, 나, '체력 물약', 33), 33);
    await verify('체력 물약 30개를 우편으로 받은 뒤 가방 창을 열면 아이템이 30개 넘게 있어도 가방 창이 모두 받아 「체력 물약 x33」이 보인다', 화면 && 서버, true);
  });
});
