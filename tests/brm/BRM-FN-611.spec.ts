import { defineCase, test, verify } from '@platform/kit';
import { 폰상태에서 } from '@platform/kit/parts';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 서버개수 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-611',
  name: '「판매」 직후 통신이 끊겼다 이어지면 체력 물약이 1개만 줄고 게임이 멈추지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['오류 추정'],
  elements: ['item:체력 물약', 'flow:골드-판매'],
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
  await test.step('체력 물약 「판매 7G」를 누른 직후 와이파이를 끊었다 다시 켠다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.줄버튼누르기(await 가방줄(가방, '체력 물약'), '판매');
    await 폰상태에서(driver, { 네트워크: '끊김' }, async () => undefined);
    await hud.골드가될때까지('207 G', 60_000);
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 2개 남는다', await 서버개수(admin, 나, '체력 물약'), 2);
    const 화면 = await verify('가방 창에 「체력 물약 x2」가 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x2');
    const 멈춤 = await verify('게임이 멈추지 않고 상단 바가 보인다', (await game.find(공통HUD.레벨줄)) !== null, true);
    await verify('「판매」 직후 통신이 끊겼다 이어지면 체력 물약이 1개만 줄고 게임이 멈추지 않는다', 서버 && 화면 && 멈춤, true);
  });
});
