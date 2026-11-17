import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 레벨마다경험치글, 필요량 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-371',
  name: '레벨을 11 부터 20 까지 바꾸면 경험치 막대의 필요량이 레벨 곡선 표 11~20 줄과 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:11', 'level:12', 'level:13', 'level:14', 'level:15', 'level:16', 'level:17', 'level:18', 'level:19', 'level:20'],
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

    await test.step('GM 명령으로 레벨을 11 부터 20 까지 바꾸며 경험치 막대를 읽는다', async () => {
      const 글들 = await 레벨마다경험치글(game, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      const 같음: boolean[] = [];
      같음.push(await verify.element('레벨 11 일 때 경험치 막대의 필요량이 레벨 곡선 표 11 줄과 같다', 'level:11', 필요량(글들[0] ?? ''), '3648'));
      같음.push(await verify.element('레벨 12 일 때 경험치 막대의 필요량이 레벨 곡선 표 12 줄과 같다', 'level:12', 필요량(글들[1] ?? ''), '4156'));
      같음.push(await verify.element('레벨 13 일 때 경험치 막대의 필요량이 레벨 곡선 표 13 줄과 같다', 'level:13', 필요량(글들[2] ?? ''), '4687'));
      같음.push(await verify.element('레벨 14 일 때 경험치 막대의 필요량이 레벨 곡선 표 14 줄과 같다', 'level:14', 필요량(글들[3] ?? ''), '5238'));
      같음.push(await verify.element('레벨 15 일 때 경험치 막대의 필요량이 레벨 곡선 표 15 줄과 같다', 'level:15', 필요량(글들[4] ?? ''), '5809'));
      같음.push(await verify.element('레벨 16 일 때 경험치 막대의 필요량이 레벨 곡선 표 16 줄과 같다', 'level:16', 필요량(글들[5] ?? ''), '6400'));
      같음.push(await verify.element('레벨 17 일 때 경험치 막대의 필요량이 레벨 곡선 표 17 줄과 같다', 'level:17', 필요량(글들[6] ?? ''), '7009'));
      같음.push(await verify.element('레벨 18 일 때 경험치 막대의 필요량이 레벨 곡선 표 18 줄과 같다', 'level:18', 필요량(글들[7] ?? ''), '7636'));
      같음.push(await verify.element('레벨 19 일 때 경험치 막대의 필요량이 레벨 곡선 표 19 줄과 같다', 'level:19', 필요량(글들[8] ?? ''), '8281'));
      같음.push(await verify.element('레벨 20 일 때 경험치 막대의 필요량이 레벨 곡선 표 20 줄과 같다', 'level:20', 필요량(글들[9] ?? ''), '8944'));
      await verify('레벨을 11 부터 20 까지 바꾸면 경험치 막대의 필요량이 레벨 곡선 표 11~20 줄과 같다', 같음.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
