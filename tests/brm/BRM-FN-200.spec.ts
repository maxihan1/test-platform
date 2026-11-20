import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 체력물약비우기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-200',
  name: '체력 물약이 없을 때 「물약」 버튼을 누르면 「체력 물약이 없습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 체력 물약 없이 혼자 던전에 들어와 있다'],
  techniques: ['동등 분할'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('체력 물약을 모두 판다', async () => {
    const 비움 = await 체력물약비우기(game);
    await verify('가방에 체력 물약이 없다', 비움, true, { blocker: true });
  });
  await test.step('일반 회원이 체력 물약 없이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 던전.hud.물약누르기();
    await verify('체력 물약이 없을 때 「물약」 버튼을 누르면 「체력 물약이 없습니다」 오류 알림이 뜬다', await 던전.hud.알림뜸('체력 물약이 없습니다'), true);
  });
});
