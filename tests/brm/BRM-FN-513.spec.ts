import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 메뉴가세로줄인가, 메뉴자리 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-513',
  name: '메뉴의 자리를 읽으면 로비에서는 메뉴가 화면 왼쪽에 세로 줄로 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['state:장소=로비', 'state:장소=던전'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('메뉴의 자리를 읽는다', async () => {
    const 로비왼쪽 = await verify('로비 메뉴가 화면 왼쪽에 있다', (await 메뉴자리(game))?.가로 === '왼쪽', true);
    const 로비세로 = await verify('로비 메뉴 버튼이 세로 줄로 늘어서 있다', await 메뉴가세로줄인가(game), true);
    await verify('메뉴의 자리를 읽으면 로비에서는 메뉴가 화면 왼쪽에 세로 줄로 있다', 로비왼쪽 && 로비세로, true);
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    const 자리 = await 메뉴자리(game);
    const 던전오른쪽 = await verify('던전 메뉴가 화면 오른쪽에 있다', 자리?.가로 === '오른쪽', true);
    const 던전가운데 = await verify('던전 메뉴가 화면 세로 가운데에 있다', 자리?.가운데세로 === true, true);
    await verify('던전에서는 메뉴가 화면 오른쪽 가운데에 있다', 던전오른쪽 && 던전가운데, true);
  });
});
