import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 레벨마다경험치글, 필요량 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-372',
  name: '레벨을 21 부터 29 까지 바꾸면 경험치 막대의 필요량이 레벨 곡선 표 21~29 줄과 같고 30 은 「최고 레벨」이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:21', 'level:22', 'level:23', 'level:24', 'level:25', 'level:26', 'level:27', 'level:28', 'level:29', 'level:30'],
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

    await test.step('GM 명령으로 레벨을 21 부터 30 까지 바꾸며 경험치 막대를 읽는다', async () => {
      const 글들 = await 레벨마다경험치글(game, [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
      const 같음: boolean[] = [];
      같음.push(await verify.element('레벨 21 일 때 경험치 막대의 필요량이 레벨 곡선 표 21 줄과 같다', 'level:21', 필요량(글들[0] ?? ''), '9623'));
      같음.push(await verify.element('레벨 22 일 때 경험치 막대의 필요량이 레벨 곡선 표 22 줄과 같다', 'level:22', 필요량(글들[1] ?? ''), '10318'));
      같음.push(await verify.element('레벨 23 일 때 경험치 막대의 필요량이 레벨 곡선 표 23 줄과 같다', 'level:23', 필요량(글들[2] ?? ''), '11030'));
      같음.push(await verify.element('레벨 24 일 때 경험치 막대의 필요량이 레벨 곡선 표 24 줄과 같다', 'level:24', 필요량(글들[3] ?? ''), '11757'));
      같음.push(await verify.element('레벨 25 일 때 경험치 막대의 필요량이 레벨 곡선 표 25 줄과 같다', 'level:25', 필요량(글들[4] ?? ''), '12500'));
      같음.push(await verify.element('레벨 26 일 때 경험치 막대의 필요량이 레벨 곡선 표 26 줄과 같다', 'level:26', 필요량(글들[5] ?? ''), '13257'));
      같음.push(await verify.element('레벨 27 일 때 경험치 막대의 필요량이 레벨 곡선 표 27 줄과 같다', 'level:27', 필요량(글들[6] ?? ''), '14029'));
      같음.push(await verify.element('레벨 28 일 때 경험치 막대의 필요량이 레벨 곡선 표 28 줄과 같다', 'level:28', 필요량(글들[7] ?? ''), '14816'));
      같음.push(await verify.element('레벨 29 일 때 경험치 막대의 필요량이 레벨 곡선 표 29 줄과 같다', 'level:29', 필요량(글들[8] ?? ''), '15616'));
      같음.push(await verify.element('레벨 30 일 때 경험치 막대의 필요량이 레벨 곡선 표 30 줄과 같다', 'level:30', 필요량(글들[9] ?? ''), '최고 레벨'));
      await verify('레벨을 21 부터 29 까지 바꾸면 경험치 막대의 필요량이 레벨 곡선 표 21~29 줄과 같고 30 은 「최고 레벨」이다', 같음.every(Boolean), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
