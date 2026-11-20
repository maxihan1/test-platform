import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방줄이름이될때까지, 물약글이될때까지, 사기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 체력맞추기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-195',
  name: '던전 화면의 「물약 3」 버튼을 누르면 체력 물약이 쓰여 「물약 2」가 된다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['item:체력 물약', 'class:탱커'],
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
    await verify('물약 버튼 글이 「물약 3」이다', await 던전.hud.물약버튼글(), '물약 3', { blocker: true });
    await 체력맞추기(game, 100);
    await 던전.hud.물약누르기();
    await verify('던전 화면의 「물약 3」 버튼을 누르면 체력 물약이 쓰여 「물약 2」가 된다', await 물약글이될때까지(game, '물약 2'), true);
  });
  await test.step('「/gm hp 100」 뒤 가방 창의 체력 물약 줄 「사용」을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 사기(game, '체력 물약');
    await verify('물약 버튼 글이 「물약 3」이다', await 던전.hud.물약버튼글(), '물약 3', { blocker: true });
    await 체력맞추기(game, 100);
    const 가방 = await 가방창.열기(game);
    const 줄 = await 가방.줄찾기('체력 물약');
    await verify('가방에 체력 물약 줄이 있다', 줄 !== null, true, { blocker: true });
    await 가방.줄버튼누르기(줄 ?? 0, '사용');
    await verify('체력 물약이 쓰여 「체력 물약 x2」가 된다', await 가방줄이름이될때까지(가방, 줄 ?? 0, 'x2'), true);
  });
});
