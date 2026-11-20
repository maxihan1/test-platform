import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 떠오른글읽기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 체력맞추기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-135',
  name: '던전에서 체력 물약으로 회복하면 머리 위로 초록색 「+」 숫자가 떠오른다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
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
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm hp 100」 뒤 「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 체력맞추기(game, 100);
    await 던전.hud.물약누르기();
    const 숫자 = await 떠오른글읽기(game, 던전화면.회복숫자, 10_000);
    const 떴다 = await verify('내 머리 위에 회복 숫자가 뜬다', 숫자 !== null, true);
    const 더하기 = await verify('숫자 앞에 「+」가 붙는다', 숫자?.글.startsWith('+'), true);
    const 초록 = await verify('숫자 색이 초록이다', 숫자?.색, '초록');
    await verify('던전에서 체력 물약으로 회복하면 머리 위로 초록색 「+」 숫자가 떠오른다', 떴다 && 더하기 && 초록, true);
  });
});
