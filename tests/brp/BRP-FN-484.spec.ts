import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 소셜정리, 우편함창닫기, 우편함창열기 } from './helpers/social.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-484',
  name: '메뉴 「우편」을 누르면 로비와 던전에서 우편함 창이 열린다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  await test.cleanup('방을 로비로 돌리고 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 소셜정리(admin, [{ 아이디: 둘아이디, 비밀번호: 둘비밀번호 }]);
  });

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 둘아이디, 둘비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비와 던전에서 메뉴 「우편」을 누른다', async () => {
    const 로비값 = await 우편함창열기(game);
    const 로비열림 = await verify('로비에서 우편함 창이 열린다', 로비값, true);
    await 우편함창닫기(game);
    await 던전입장(game, '탱커');
    const 던전열림 = await verify('던전에서 우편함 창이 열린다', await 우편함창열기(game), true);
    await verify('메뉴 「우편」을 누르면 로비와 던전에서 우편함 창이 열린다', 로비열림 && 던전열림, true);
  });
});
