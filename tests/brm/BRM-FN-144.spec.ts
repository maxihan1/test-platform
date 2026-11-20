import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-144',
  name: '장비 없이 레벨 2 가 되면 공격 배율이 1.03 · 방어율이 0.01 이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:2'],
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
  await test.step('「/gm level 2」 뒤 「/gm stat」 첫 줄을 읽는다', async () => {
    await 레벨맞추기(game, 2);
    const 상태 = await GM상태(game);
    const 공격 = await verify('공격 배율이 1.03 이다', Number(상태['공격배율']), 1.03);
    const 방어 = await verify('방어율이 0.01 이다', Number(상태['방어율']), 0.01);
    await verify('장비 없이 레벨 2 가 되면 공격 배율이 1.03 · 방어율이 0.01 이다', 공격 && 방어, true);
  });
});
