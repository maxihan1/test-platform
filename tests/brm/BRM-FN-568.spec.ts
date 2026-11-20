import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상단바자리 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-568',
  name: '상단 바의 자리와 크기를 읽으면 던전 상단 바는 가운데 위에 있고 로비 상단 바보다 작다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
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
  let 로비막대너비 = 0;
  await test.step('일반 회원이 로비 상단 바의 크기를 잰 뒤 혼자 던전에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 로비바 = await 상단바자리(game);
    로비막대너비 = 로비바.rect?.[2] ?? 0;
    await verify('로비 상단 바의 크기를 읽는다', 로비막대너비 > 0, true, { blocker: true });
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('상단 바의 자리와 크기를 읽는다', async () => {
    const 던전바 = await 상단바자리(game);
    const 막대 = 던전바.rect ?? [0, 0, 0, 0];
    const 화면 = 던전바.screen ?? [1, 1];
    const 가운데 = await verify('던전 상단 바가 가운데에 있다', Math.abs((막대[0] ?? 0) + (막대[2] ?? 0) / 2 - (화면[0] ?? 1) / 2) <= (화면[0] ?? 1) * 0.05, true);
    const 위 = await verify('던전 상단 바가 위에 있다', (막대[1] ?? 0) + (막대[3] ?? 0) / 2 >= (화면[1] ?? 1) * 0.75, true);
    const 작다 = await verify('던전 상단 바가 로비 상단 바보다 작다', (막대[2] ?? 0) > 0 && (막대[2] ?? 0) < 로비막대너비, true);
    await verify('상단 바의 자리와 크기를 읽으면 던전 상단 바는 가운데 위에 있고 로비 상단 바보다 작다', 가운데 && 위 && 작다, true);
  });
});
