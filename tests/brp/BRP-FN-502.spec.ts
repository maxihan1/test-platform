import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { GM스탯 } from './helpers/gm.helper.js';
import { 로비로되돌리기, 봇시키기, 손님봇켜기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-502',
  name: '「준비 취소」를 누르면 확정이 풀려 다른 카드를 다시 고를 수 있다',
  platforms: ['windows'],
  precondition: ['일반 회원이 영웅을 확정해 버튼이 「준비 취소」다', '준비하지 않은 손님 봇이 로비에 있어 던전이 바로 열리지 않는다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  let 손님 = '';
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 영웅을 확정해 버튼이 「준비 취소」인 것을 확인한다', async () => {
    손님 = await 손님봇켜기(admin, 'qaguest1');
    const 로비 = await 로비화면.열림(game);
    await 로비.직업고르기('탱커');
    await 로비.준비누르기();
    await verify('버튼 글이 「준비 취소」다', await 로비.준비글될때까지('준비 취소'), true, { blocker: true });
  });

  await test.step('「준비 취소」를 누르고 다른 카드를 누른다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.준비누르기();
    const 풀렸다 = await verify('확정이 풀려 버튼 글이 「준비!」로 돌아온다', await 로비.준비글될때까지('준비!'), true);
    await 로비.직업고르기('마법사');
    await 봇시키기(admin, 손님, 'seat:6');
    await 봇시키기(admin, 손님, 'ready');
    await 로비.준비누르기();
    const 던전 = await 던전화면.안내창뜸(game);
    await 던전.안내창닫기();
    const 다시고름 = await verify('다시 고른 영웅으로 던전에 들어간다', (await GM스탯(game))['직업'], '마법사');
    await verify('「준비 취소」를 누르면 확정이 풀려 다른 카드를 다시 고를 수 있다', 풀렸다 && 다시고름, true);
  });
});
