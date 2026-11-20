import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 경험치주기, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-145',
  name: '최고 레벨에서 경험치 500 을 받으면 「/gm stat」 경험치가 500 늘고 레벨은 30 이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:레벨=30', 'move:레벨 30→31'],
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
  await test.step('「/gm level 30」 뒤 「/gm exp 500」을 보내고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 레벨맞추기(game, 30);
    const 전 = await GM상태(game);
    await 경험치주기(game, 500);
    const 후 = await GM상태(game);
    const 늘어남 = await verify('「/gm stat」 경험치가 500 늘어난다', Number(후['경험치']) - Number(전['경험치']), 500);
    const 레벨 = await verify('레벨이 30 이다', Number(후['레벨']), 30);
    await verify('최고 레벨에서 경험치 500 을 받으면 「/gm stat」 경험치가 500 늘고 레벨은 30 이다', 늘어남 && 레벨, true);
  });
});
