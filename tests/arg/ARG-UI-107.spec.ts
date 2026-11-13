import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-107',
  name: '상점 창에 「녹슨 단검」은 #E8E2D6, 「강철 롱소드」는 #5AB8FF, 「룬 새김 도끼」는 #C77DFF 색으로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['item:rusty_dagger', 'item:steel_longsword', 'item:rune_axe'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    단검색: z.string().describe('「녹슨 단검」 이름 색').default('#E8E2D6'),
    롱소드색: z.string().describe('「강철 롱소드」 이름 색').default('#5AB8FF'),
    도끼색: z.string().describe('「룬 새김 도끼」 이름 색').default('#C77DFF'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('상점 창을 열어 상품 이름 색을 확인한다', async () => {
    const 상점 = await 상점창.열기(game);
    const 단검 = await verify('「녹슨 단검」 이름에 #E8E2D6 색이 든다', (await 상점.이름원문(await 상점.줄찾기('녹슨 단검'))).includes(expected.단검색), true);
    const 롱소드 = await verify('「강철 롱소드」 이름에 #5AB8FF 색이 든다', (await 상점.이름원문(await 상점.줄찾기('강철 롱소드'))).includes(expected.롱소드색), true);
    const 도끼 = await verify('「룬 새김 도끼」 이름에 #C77DFF 색이 든다', (await 상점.이름원문(await 상점.줄찾기('룬 새김 도끼'))).includes(expected.도끼색), true);
    await verify('상점 창에 「녹슨 단검」은 #E8E2D6, 「강철 롱소드」는 #5AB8FF, 「룬 새김 도끼」는 #C77DFF 색으로 보인다', 단검 && 롱소드 && 도끼, true);
  });
});
