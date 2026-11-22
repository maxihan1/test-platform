import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 가방요약, 봇과던전입장, 알림글읽기 } from './helpers/items.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM기절, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-188',
  name: '로비에서 체력 물약을 쓰면 오류 알림 「던전에서 살아 있을 때만 쓸 수 있습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있고 가방이 기준 상태(체력 물약 3)다', '일반 회원이 탱커로 혼자 던전에서 쓰러져 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  const 안내글 = '던전에서 살아 있을 때만 쓸 수 있습니다';
  await test.cleanup('봇을 끄고 방을 로비로 돌린 뒤 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('가방이 기준 상태인 것을 확인한다', async () => {
    await verify('가방에 체력 물약 3개만 있다', await 가방요약(game), '체력 물약 x3', { blocker: true });
  });

  await test.step('가방 창에서 체력 물약 「사용」을 누른다', async () => {
    const 로비가방 = await 가방창.열기(game);
    await 로비가방.사용하기('체력 물약');
    const 로비글 = await 알림글읽기(game, 안내글);
    await verify('로비에서 체력 물약을 쓰면 오류 알림 「던전에서 살아 있을 때만 쓸 수 있습니다」가 뜬다', 로비글 !== null, true);
    await 로비가방.닫기();
    await new 알림띠(game).사라질때까지(안내글);

    await 봇과던전입장(admin, game, 봇아이디, 봇비밀번호);
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    await GM기절(game);
    await verify('/gm stat 체력이 0 이다', 스탯숫자(await GM스탯(game), '체력'), 0, { blocker: true });
    const 던전가방 = await 가방창.열기(game);
    await 던전가방.사용하기('체력 물약');
    const 던전글 = await 알림글읽기(game, 안내글);
    await verify('쓰러진 상태에서 체력 물약을 쓴 뒤 오류 알림 「던전에서 살아 있을 때만 쓸 수 있습니다」가 뜬다', 던전글 !== null, true);
  });
});
