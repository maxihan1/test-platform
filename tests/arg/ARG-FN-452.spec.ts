import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-452',
  name: '정지된 계정으로 로그인하면 「이용 정지 계정」 창에 「운영 정책에 따라 이용이 정지된 계정입니다」와 「사유: <사유>」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정이 끝나는 시각 없이 정지돼 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 사유 = '자동 시험 정지';
  let 제재 = 0;
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('두 번째 플레이어 계정을 끝나는 시각 없이 정지시키고 로그인 화면을 기다린다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      제재 = await 제재걸기(admin, 둘째, 'SUSPEND', 사유);
      화면 = await 로그인화면.열기(game);
    });
    await test.step('로그인 화면을 확인한다', async () => {
      await verify('로그인 화면에 「게임 시작」 버튼이 보인다', await 화면.보이나(로그인화면.게임시작), true, { blocker: true });
    });

    await test.step('정지된 계정으로 로그인한다', async () => {
      await 화면.로그인(둘째, 둘째비밀번호);
      const 창 = await 접속안내창.제목이될때까지(game, '이용 정지 계정');
      const 제목 = await verify('「이용 정지 계정」 창이 보인다', (await 창?.제목글()) === '이용 정지 계정', true);
      const 본문 = (await 창?.본문글()) ?? '';
      const 정책 = await verify('창에 「운영 정책에 따라 이용이 정지된 계정입니다」 문구가 보인다', 본문.includes('운영 정책에 따라 이용이 정지된 계정입니다'), true);
      const 이유 = await verify('창에 「사유: <사유>」 문구가 보인다', 본문.includes(`사유: ${사유}`), true);
      await verify('정지된 계정으로 로그인하면 「이용 정지 계정」 창에 「운영 정책에 따라 이용이 정지된 계정입니다」와 「사유: <사유>」가 보인다', 제목 && 정책 && 이유, true);
    });
  } finally {
    if (제재 > 0) await 제재풀기(admin, 제재);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
