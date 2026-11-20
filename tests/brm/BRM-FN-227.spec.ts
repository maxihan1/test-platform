import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄, 서버개수, 서버골드 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-227',
  name: '골드 200 으로 강철 롱소드 구매가 거절되면 골드 200 과 가방이 그대로다',
  platforms: ['android'],
  precondition: ['일반 회원이 골드 200 으로 로비에 있다'],
  techniques: ['동등 분할'],
  elements: ['item:강철 롱소드', 'shop:강철 롱소드', 'flow:골드-상점 구매'],
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
  await test.step('일반 회원의 골드를 200 으로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
    await 골드맞추기(game, 200);
    await verify('상단 바 골드가 「200 G」다', await hud.골드글(), '200 G', { blocker: true });
  });
  await test.step('상점에서 강철 롱소드 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매누르기(await 상점줄(상점, '강철 롱소드'));
    await hud.알림뜸('골드가 부족합니다');
    const 화면골드 = await verify('상단 바 골드가 「200 G」다', await hud.골드글(), '200 G');
    const 서버골드값 = await verify('운영툴 캐릭터 골드가 200 이다', await 서버골드(admin, 나), 200);
    const 서버롱소드 = await verify('운영툴 캐릭터 아이템에서 강철 롱소드가 0개다', await 서버개수(admin, 나, '강철 롱소드'), 0);
    const 가방 = await 가방창.열기(game);
    const 화면롱소드 = await verify('가방 창에 강철 롱소드 줄이 없다', await 가방.이름줄수('강철 롱소드'), 0);
    await verify('골드 200 으로 강철 롱소드 구매가 거절되면 골드 200 과 가방이 그대로다', 화면골드 && 서버골드값 && 서버롱소드 && 화면롱소드, true);
  });
});
