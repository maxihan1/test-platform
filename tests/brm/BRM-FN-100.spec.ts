import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-100',
  name: '로비에서 탱커를 고르면 오른쪽 정보 상자에 직업 이름 「탱커」와 스킬 아이콘이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['class:탱커', 'skill:방패 오라'],
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
  await test.step('탱커 카드를 누른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 로비.자리누르기(0);
    const 직업 = await verify('직업 이름 「탱커」가 보인다', await 로비.현재직업이될때까지('탱커'), true);
    const 묶음 = await verify('스킬 아이콘 묶음이 보인다', await 로비.스킬묶음보임(), true);
    await verify('로비에서 탱커를 고르면 오른쪽 정보 상자에 직업 이름 「탱커」와 스킬 아이콘이 보인다', 직업 && 묶음, true);
  });
});
