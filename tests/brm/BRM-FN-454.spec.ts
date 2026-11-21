import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 가방채우기, 서버골드가될때까지, 장착하기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-454',
  name: '가방 창의 체력 물약 「판매 7G」를 누르면 행운의 반지를 끼고 체력 물약을 팔아도 골드는 7 만 는다',
  platforms: ['android'],
  precondition: ['일반 회원이 행운의 반지를 끼고 로비에 있다'],
  elements: ['item:행운의 반지', 'item:체력 물약', 'flow:골드-판매'],
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
  await test.step('일반 회원이 행운의 반지를 끼고 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '행운의 반지', 개수: 1 }]);
    await 장착하기(game, '행운의 반지');
    const 가방 = await 가방창.열기(game);
    await verify('장신구 칸에 「행운의 반지」가 있다', await 가방.칸내용('장신구'), '행운의 반지', { blocker: true });
  });
  await test.step('가방 창의 체력 물약 「판매 7G」를 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    const 전 = await 서버골드가될때까지(admin, 나, await hud.골드값());
    await 가방.줄버튼누르기(await 가방줄(가방, '체력 물약'), '판매');
    await hud.골드가될때까지('207 G');
    const 서버 = await verify('운영툴 캐릭터 골드가 7 늘었다', (await 서버골드가될때까지(admin, 나, 전 + 7)) - 전, 7);
    const 화면 = await verify('상단 바 골드가 「207 G」다', await hud.골드글(), '207 G');
    await verify('가방 창의 체력 물약 「판매 7G」를 누르면 행운의 반지를 끼고 체력 물약을 팔아도 골드는 7 만 는다', 서버 && 화면, true);
  });
});
