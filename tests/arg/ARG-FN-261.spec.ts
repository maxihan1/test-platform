import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 정지창뜰때까지, 정지창본문, 팝업닫기 } from './helpers/social.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 끝날시각, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-261',
  name: '접속 중인 계정이 정지되면 30초 주기 안에 내보내지고 「이용 정지 계정」 창에 「사유: <사유>」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정으로 로그인해 로비에 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  let 정지번호 = 0;
  try {
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 로비로 들어간다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 로비로(game, 둘째, 둘째비밀번호);
    });
    await test.step('두 번째 플레이어 계정이 로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('끝나는 시각을 정해 계정을 정지시킨다', async () => {
      정지번호 = await 제재걸기(admin, 둘째, 'SUSPEND', '자동 시험 정지', 끝날시각(30));
      const 떴다 = await verify('정지가 걸린 뒤 「이용 정지 계정」 창이 뜬다', await 정지창뜰때까지(game, 35_000), true);
      const 본문 = await 정지창본문(game);
      const 사유 = await verify('창에 「사유: 자동 시험 정지」가 보인다', 본문.includes('사유: 자동 시험 정지'), true);
      await verify('접속 중인 계정이 정지되면 30초 주기 안에 내보내지고 「이용 정지 계정」 창에 「사유: <사유>」가 보인다', 떴다 && 사유, true);
      await verify('내보낼 때 뜬 창에는 「종료 예정」 줄이 없다', 본문.includes('종료 예정'), false);
    });
  } finally {
    await 팝업닫기(game);
    if (정지번호 !== 0) await 제재풀기(admin, 정지번호);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
