import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 접속상태 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-131',
  name: '새 캐릭터로 처음 들어오면 상단 바 레벨이 「Lv.1」이다',
  platforms: ['windows'],
  precondition: ['새 계정의 캐릭터를 지워 두었다'],
  elements: ['state:레벨=1'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.newId ?? '';
  const 비밀번호 = params.newPassword ?? '';
  await test.cleanup('새 계정의 캐릭터를 지우기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'new'));

  await test.step('새 계정의 캐릭터를 지운 것을 확인한다', async () => {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'new');
    const 접속자 = (await 접속상태(admin)).players;
    await verify('새 계정이 접속해 있지 않다', 접속자.some((p) => p.user === 아이디), false, { blocker: true });
  });

  await test.step('새 계정으로 처음 로그인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    const 레벨글 = 색글떼기(await new 공통HUD(game).레벨이름());
    await verify('새 캐릭터로 처음 들어오면 상단 바 레벨이 「Lv.1」이다', 레벨글.split(/\s+/)[0], 'Lv.1');
  });
});
