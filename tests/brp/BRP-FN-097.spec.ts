import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 데이터표줄찾기, 표읽기 } from './helpers/dungeon.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-097',
  name: '/gm data skill 로 공통 행동 줄을 읽으면 모든 직업이 공통 행동 「부활」 · 「들기」 · 「내려놓기」를 쓴다',
  platforms: ['windows'],
  precondition: ['직업 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['skill:부활', 'skill:들기', 'skill:내려놓기'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm data skill 로 공통 행동 줄을 읽는다', async () => {
    const 표 = await 표읽기(game, 'skill');
    const 이름들 = 데이터표줄찾기(표, '공통 행동').스킬.map((스킬) => 스킬.이름);
    await verify('공통 행동 줄에 스킬이 있다', 이름들.length > 0, true, { blocker: true });
    const 부활 = await verify('공통 행동에 「부활」이 있다', 이름들.includes('부활'), true);
    const 들기 = await verify('공통 행동에 「들기」가 있다', 이름들.includes('들기'), true);
    const 내려놓기 = await verify('공통 행동에 「내려놓기」가 있다', 이름들.includes('내려놓기'), true);
    await verify('/gm data skill 로 공통 행동 줄을 읽으면 모든 직업이 공통 행동 「부활」 · 「들기」 · 「내려놓기」를 쓴다', 부활 && 들기 && 내려놓기, true);
  });
});
