import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드가넘을때까지 } from './helpers/dungeon-tools.helper.js';
import { 가방줄, 서버개수가될때까지, 서버골드가될때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-610',
  name: '가방 창에서 「판매」를 빠르게 두 번 눌러도 누른 수를 넘겨 팔리지 않는다(이미 판 것은 무시한다)',
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
  await test.step('가방 창의 체력 물약 「판매 7G」를 빠르게 두 번 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    const 줄 = await 가방줄(가방, '체력 물약');
    await game.click(`${가방창.줄주소(줄)}/*[contains(@name,Button 판매)]`, { count: 2, interval: 0.2 });
    const 첫골드 = await 골드가넘을때까지(game, 200, 20_000);
    await verify('판매가 반영돼 상단 바 골드가 는다', 첫골드 > 200, true, { blocker: true });
    const 골드 = await 골드가넘을때까지(game, 첫골드, 3_000);
    const 판수 = (골드 - 200) / 7;
    const 누른수안 = await verify('빠르게 두 번 눌러도 2개를 넘겨 팔리지 않는다', 판수 >= 1 && 판수 <= 2, true);
    const 서버물약 = await verify('운영툴 캐릭터 아이템의 체력 물약이 판 만큼만 준다', await 서버개수가될때까지(admin, 나, '체력 물약', 3 - 판수), 3 - 판수);
    const 서버골드값 = await verify('운영툴 캐릭터 골드가 판 만큼(개당 7)만 는다', await 서버골드가될때까지(admin, 나, 골드), 골드);
    await verify('가방 창에서 「판매」를 빠르게 두 번 눌러도 누른 수를 넘겨 팔리지 않는다(이미 판 것은 무시한다)', 누른수안 && 서버물약 && 서버골드값, true);
  });
});
