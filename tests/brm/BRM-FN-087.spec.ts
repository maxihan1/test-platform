import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-087',
  name: '오른쪽 아래 행동 막대를 확인하면 던전 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼 넷과 키 번호가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 궁수로 혼자 던전에 들어와 있다'],
  elements: ['class:궁수'],
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
  await test.step('일반 회원이 궁수로 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 2);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('오른쪽 아래 행동 막대를 확인한다', async () => {
    const 던전 = await 던전화면.열기(game);
    await verify('「공격」 버튼이 떠 있다', await 던전.행동버튼뜰때까지('공격'), true, { blocker: true });
    const 공격 = await verify('「공격」 버튼이 보인다', await 던전.보임(던전화면.버튼('공격')), true);
    const 스킬1 = await verify('「스킬 1」 버튼이 보인다', await 던전.보임(던전화면.버튼('스킬 1')), true);
    const 스킬2 = await verify('「스킬 2」 버튼이 보인다', await 던전.보임(던전화면.버튼('스킬 2')), true);
    const 감정 = await verify('「감정」 버튼이 보인다', await 던전.보임(던전화면.버튼('감정')), true);
    const 키1 = await verify('「공격」 버튼 키 번호가 1 이다', await 던전.행동버튼키('공격'), '1');
    const 키2 = await verify('「스킬 1」 버튼 키 번호가 2 다', await 던전.행동버튼키('스킬 1'), '2');
    const 키3 = await verify('「스킬 2」 버튼 키 번호가 3 이다', await 던전.행동버튼키('스킬 2'), '3');
    const 키4 = await verify('「감정」 버튼 키 번호가 4 다', await 던전.행동버튼키('감정'), '4');
    await verify('오른쪽 아래 행동 막대를 확인하면 던전 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼 넷과 키 번호가 보인다', 공격 && 스킬1 && 스킬2 && 감정 && 키1 && 키2 && 키3 && 키4, true);
  });
});
