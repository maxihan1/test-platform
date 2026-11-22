import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 실패걸기, 캐릭터값기다리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-072',
  name: '다음 저장 요청 한 번이 실패하게 걸고 GM 명령으로 골드를 1579 로 바꾸면 저장이 한 번 실패해도 다음 주기에 다시 저장해 30초 안에 운영 API 골드가 1579 가 된다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    한도초: z.number().describe('운영 API 값이 바뀌는 한도(초)').default(30),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('다음 저장 요청 한 번이 실패하게 걸고 GM 명령으로 골드를 1579 로 바꾼다', async () => {
    await 실패걸기(admin, '/api/saveplayercharacter');
    await GM골드(game, 1579);
    const 시작 = Date.now();
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => c.gold === 1579, 40_000);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 골드 = await verify('운영 API 캐릭터 골드가 1579 다', 값.gold, 1579);
    const 시간 = await verify('저장 한도 안에 바뀐다', 걸린초 <= expected.한도초, true);
    await verify('다음 저장 요청 한 번이 실패하게 걸고 GM 명령으로 골드를 1579 로 바꾸면 저장이 한 번 실패해도 다음 주기에 다시 저장해 30초 안에 운영 API 골드가 1579 가 된다', 골드 && 시간, true);
  });
});
