import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지금화면, 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 탱커모으기효과 } from './pages/tank-charge-fx.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-645',
  name: '탱커가 던전에서 「스킬 1」을 누르면 영웅에게 힘을 모으는 효과가 보인다',
  platforms: ['android'],
  precondition: ['탱커로 혼자 던전에 들어와 있다'],
  elements: ['state:장소=던전', 'state:직업=탱커'],
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
  await test.step('탱커로 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('던전에서 「스킬 1」을 눌러 둔다', async () => {
    const 뜸 = await 탱커모으기효과.스킬1눌러두고뜸(game);
    await verify('탱커가 던전에서 「스킬 1」을 누르면 영웅에게 힘을 모으는 효과가 보인다', 뜸, true);
  });
});
