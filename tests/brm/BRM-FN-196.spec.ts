import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 물약글이될때까지, 물약두번누르기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 체력맞추기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-196',
  name: '「/gm hp 100」 뒤 「물약」 버튼을 두 번 이어 누르면 체력 물약은 재사용 대기 없이 이어 써져 「물약 1」이 된다',
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
  await test.step('「/gm hp 100」 뒤 「물약」 버튼을 두 번 이어 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await verify('물약 버튼 글이 「물약 3」이다', await 던전.hud.물약버튼글(), '물약 3', { blocker: true });
    await 체력맞추기(game, 100);
    await 물약두번누르기(game);
    await verify('「/gm hp 100」 뒤 「물약」 버튼을 두 번 이어 누르면 체력 물약은 재사용 대기 없이 이어 써져 「물약 1」이 된다', await 물약글이될때까지(game, '물약 1'), true);
  });
});
