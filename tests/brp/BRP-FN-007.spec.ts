import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기, 방로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-007',
  name: '네 직업으로 차례로 던전에 들어가 내 영웅의 이동 속도를 읽으면 네 직업 모두 이동 속도가 5 로 같다',
  platforms: ['windows'],
  precondition: ['직업 표를 게임 데이터 명령으로 읽을 수 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('네 직업으로 차례로 던전에 들어가 내 영웅의 이동 속도를 읽는다', async () => {
    const 읽은: Record<string, number> = {};
    for (const 직업 of ['탱커', '궁수', '마법사', '도적'] as const) {
      if (직업 !== '탱커') await 방로비로(admin, game);
      const 던전 = await 던전입장(game, 직업);
      읽은[직업] = await 던전.내이동속도();
    }
    const 탱커 = await verify('탱커 이동 속도가 5 다', 읽은['탱커'], 5);
    const 궁수 = await verify('궁수 이동 속도가 5 다', 읽은['궁수'], 5);
    const 마법사 = await verify('마법사 이동 속도가 5 다', 읽은['마법사'], 5);
    const 도적 = await verify('도적 이동 속도가 5 다', 읽은['도적'], 5);
    await verify('네 직업으로 차례로 던전에 들어가 내 영웅의 이동 속도를 읽으면 네 직업 모두 이동 속도가 5 로 같다', 탱커 && 궁수 && 마법사 && 도적, true);
  });
});
