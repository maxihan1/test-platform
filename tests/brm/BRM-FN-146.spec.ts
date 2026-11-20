import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경험치막대가득 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-146',
  name: '최고 레벨이면 경험치 막대가 가득 찬 채 「최고 레벨」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:30'],
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
  await test.step('「/gm level 30」을 보내고 상단 바 경험치 막대를 읽는다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 레벨맞추기(game, 30);
    const 가득 = await verify('경험치 막대가 가득 찬다', await 경험치막대가득(game), true);
    const 글 = await verify('경험치 글에 「최고 레벨」이 보인다', (await 로비.hud.경험치()).includes('최고 레벨'), true);
    await verify('최고 레벨이면 경험치 막대가 가득 찬 채 「최고 레벨」이 보인다', 가득 && 글, true);
  });
});
