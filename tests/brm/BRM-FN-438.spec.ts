import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 열린창목록, 창이열릴때까지 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-438',
  name: '창이 열린 채 다른 메뉴를 누르면 앞 창이 닫히고 열린 창은 하나다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
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
  await test.step('일반 회원으로 로비에 들어가 가방 창을 연다', async () => {
    await 로비로(game, driver, 나);
    const 가방 = await 가방창.열기(game);
    await verify('가방 창 제목이 「가방」이다', await 가방.제목(), '가방', { blocker: true });
  });
  await test.step('가방 창을 연 채 메뉴 「상점」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.hud.메뉴누르기('상점');
    const 상점뜸 = await 창이열릴때까지(game, '상점');
    await verify('상점 창이 보인다', 상점뜸, true);
    const 앞창 = await verify('앞 창이 닫힌다', await 가방.닫힐때까지(), true);
    const 하나 = await verify('열린 창은 하나다', (await 열린창목록(game)).length, 1);
    await verify('창이 열린 채 다른 메뉴를 누르면 앞 창이 닫히고 열린 창은 하나다', 앞창 && 하나, true);
  });
});
