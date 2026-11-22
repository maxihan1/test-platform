import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-081',
  name: '오른쪽 아래 행동 막대를 읽으면 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼 넷이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 궁수로 혼자 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원이 궁수로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '궁수');
  });

  await test.step('오른쪽 아래 행동 막대를 읽는다', async () => {
    const 던전 = await 던전화면.열림(game);
    const 버튼글 = async (번호: 0 | 1 | 2 | 3): Promise<string> => ((await 던전.버튼있나(번호)) ? 던전.버튼글(번호) : '없음');
    const 키글 = async (번호: 0 | 1 | 2 | 3): Promise<string> => ((await 던전.버튼있나(번호)) ? 던전.버튼키글(번호) : '없음');
    const 공격 = await verify('「공격」 버튼이 보인다', await 버튼글(0), '공격');
    const 스킬1 = await verify('「스킬 1」 버튼이 보인다', await 버튼글(1), '스킬 1');
    const 스킬2 = await verify('「스킬 2」 버튼이 보인다', await 버튼글(2), '스킬 2');
    const 감정 = await verify('「감정」 버튼이 보인다', await 버튼글(3), '감정');
    await verify('오른쪽 아래 행동 막대를 읽으면 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼 넷이 보인다', 공격 && 스킬1 && 스킬2 && 감정, true);
    const 키1 = await verify('「공격」 버튼 아래 키 번호가 1 이다', await 키글(0), '1');
    const 키2 = await verify('「스킬 1」 버튼 아래 키 번호가 2 이다', await 키글(1), '2');
    const 키3 = await verify('「스킬 2」 버튼 아래 키 번호가 3 이다', await 키글(2), '3');
    const 키4 = await verify('「감정」 버튼 아래 키 번호가 4 이다', await 키글(3), '4');
    await verify('행동 버튼 아래에 키 번호 1 · 2 · 3 · 4 가 보인다', 키1 && 키2 && 키3 && 키4, true);
  });
});
