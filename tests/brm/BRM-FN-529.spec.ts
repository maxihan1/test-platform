import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방줄, 서버개수가될때까지 } from './helpers/items-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 체력맞추기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-529',
  name: '묶음 줄의 「사용」을 누르면 그 묶음 가운데 1개만 쓰여 「체력 물약 x2」가 된다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
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
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 열려 있다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm hp 100」 뒤 가방 창 체력 물약 묶음의 「사용」을 누른다', async () => {
    await 체력맞추기(game, 100);
    const 가방 = await 가방창.열기(game);
    await 가방.줄버튼누르기(await 가방줄(가방, '체력 물약'), '사용');
    await hud.알림뜸('체력 물약 사용');
    const 화면 = await verify('가방 창에 「체력 물약 x2」가 보인다', await 가방.줄이름(await 가방줄(가방, '체력 물약')), '체력 물약 x2');
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 2개다', await 서버개수가될때까지(admin, 나, '체력 물약', 2), 2);
    await verify('묶음 줄의 「사용」을 누르면 그 묶음 가운데 1개만 쓰여 「체력 물약 x2」가 된다', 화면 && 서버, true);
  });
});
