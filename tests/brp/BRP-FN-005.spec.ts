import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-005',
  name: '로비 아래쪽 영웅 카드를 세면 로비 아래쪽에 영웅 카드 8장이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비 아래쪽 영웅 카드를 센다', async () => {
    const 로비 = await 로비화면.열림(game);
    await verify('로비 아래쪽 영웅 카드를 세면 로비 아래쪽에 영웅 카드 8장이 보인다', await 로비.자리수(), 8);
  });

  await test.step('영웅 카드를 하나씩 눌러 정보 상자 직업 이름을 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 센: Record<string, number> = {};
    for (let 자리 = 0; 자리 < 8; 자리 += 1) {
      await 로비.자리누르기(자리);
      await 로비.자리이름글될때까지(자리, (글) => 글.includes(아이디));
      const 직업 = (await 로비.정보상자직업글()) ?? '';
      센[직업] = (센[직업] ?? 0) + 1;
    }
    const 탱커 = await verify('탱커 카드가 2장이다', 센['탱커'] ?? 0, 2);
    const 궁수 = await verify('궁수 카드가 2장이다', 센['궁수'] ?? 0, 2);
    const 마법사 = await verify('마법사 카드가 2장이다', 센['마법사'] ?? 0, 2);
    const 도적 = await verify('도적 카드가 2장이다', 센['도적'] ?? 0, 2);
    await verify('영웅 카드 8장은 탱커 2 · 궁수 2 · 마법사 2 · 도적 2 장이다', 탱커 && 궁수 && 마법사 && 도적, true);
  });
});
