import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-003',
  name: '상단 바와 상점 상품 가격을 읽으면 상단 바의 재화는 골드 하나뿐이고 상점 상품 가격이 모두 「 G」 골드로 보인다',
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

  await test.step('상단 바와 상점 상품 가격을 읽는다', async () => {
    const 골드글 = await new 공통HUD(game).골드글();
    const 상점 = await 상점창.열기(game);
    const 잘못된가격 = (await 상점.줄들())
      .filter((줄) => !/^[\d,]+ G$/.test(줄.가격글))
      .map((줄) => 줄.가격글)
      .join(', ');
    await 상점.닫기();
    const 상단 = await verify('상단 바의 재화는 골드 하나뿐이다', /^[\d,]+ G$/.test(골드글), true);
    const 가격 = await verify('상점 상품 가격이 모두 「 G」 골드로 보인다', 잘못된가격, '');
    await verify('상단 바와 상점 상품 가격을 읽으면 상단 바의 재화는 골드 하나뿐이고 상점 상품 가격이 모두 「 G」 골드로 보인다', 상단 && 가격, true);
  });
});
