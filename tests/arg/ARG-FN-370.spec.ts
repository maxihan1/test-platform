import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 레벨마다경험치글, 필요량 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-370',
  name: '레벨을 1 부터 10 까지 바꾸면 경험치 막대의 필요량이 레벨 곡선 표 1~10 줄과 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:1', 'level:2', 'level:3', 'level:4', 'level:5', 'level:6', 'level:7', 'level:8', 'level:9', 'level:10'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });

    await test.step('GM 명령으로 레벨을 1 부터 10 까지 바꾸며 경험치 막대를 읽는다', async () => {
      const 글들 = await 레벨마다경험치글(game, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const 같음: boolean[] = [];
      같음.push(await verify.element('레벨 1 일 때 경험치 막대의 필요량이 레벨 곡선 표 1 줄과 같다', 'level:1', 필요량(글들[0] ?? ''), '100'));
      같음.push(await verify.element('레벨 2 일 때 경험치 막대의 필요량이 레벨 곡선 표 2 줄과 같다', 'level:2', 필요량(글들[1] ?? ''), '282'));
      같음.push(await verify.element('레벨 3 일 때 경험치 막대의 필요량이 레벨 곡선 표 3 줄과 같다', 'level:3', 필요량(글들[2] ?? ''), '519'));
      같음.push(await verify.element('레벨 4 일 때 경험치 막대의 필요량이 레벨 곡선 표 4 줄과 같다', 'level:4', 필요량(글들[3] ?? ''), '800'));
      같음.push(await verify.element('레벨 5 일 때 경험치 막대의 필요량이 레벨 곡선 표 5 줄과 같다', 'level:5', 필요량(글들[4] ?? ''), '1118'));
      같음.push(await verify.element('레벨 6 일 때 경험치 막대의 필요량이 레벨 곡선 표 6 줄과 같다', 'level:6', 필요량(글들[5] ?? ''), '1469'));
      같음.push(await verify.element('레벨 7 일 때 경험치 막대의 필요량이 레벨 곡선 표 7 줄과 같다', 'level:7', 필요량(글들[6] ?? ''), '1852'));
      같음.push(await verify.element('레벨 8 일 때 경험치 막대의 필요량이 레벨 곡선 표 8 줄과 같다', 'level:8', 필요량(글들[7] ?? ''), '2262'));
      같음.push(await verify.element('레벨 9 일 때 경험치 막대의 필요량이 레벨 곡선 표 9 줄과 같다', 'level:9', 필요량(글들[8] ?? ''), '2700'));
      같음.push(await verify.element('레벨 10 일 때 경험치 막대의 필요량이 레벨 곡선 표 10 줄과 같다', 'level:10', 필요량(글들[9] ?? ''), '3162'));
      await verify('레벨을 1 부터 10 까지 바꾸면 경험치 막대의 필요량이 레벨 곡선 표 1~10 줄과 같다', 같음.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
