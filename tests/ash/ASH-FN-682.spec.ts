import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버다시켜질때까지, 확률줄글 } from './helpers/admin.helper.js';
import { 강화확률되돌리기, 강화확률바꾸기, 설정읽기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-682',
  name: '서버를 다시 켜면 바꿔 둔 강화 확률이 남지 않는다',
  platforms: ['android'],
  precondition: ['확률을 바꿔 두었다'],
  techniques: ['결정 테이블'],
  held: '보류 — 서버를 다시 켤 길이 없음',
  params: z.object({
    기다릴시간: z.number().int().describe('서버를 다시 켤 때까지 기다릴 시간(초)'),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 바꾼글 = '0.25 · 0.25 · 0.5';
  try {
    await test.step('강화 확률을 바꿔 둔다', async () => {
      await 강화확률바꾸기(admin, [{ targetLevel: 4, success: 0.25, fail: 0.25, destroy: 0.5 }]);
    });
    await test.step('바꿔 둔 확률을 확인한다', async () => {
      await verify('확률을 바꿔 두었다', 확률줄글((await 설정읽기(admin)).enhance, 4), 바꾼글, { blocker: true });
    });
    await test.step('서버를 다시 켜고 강화 확률을 받는다', async () => {
      await 서버다시켜질때까지(admin, params.기다릴시간 * 1000, (설정) => 확률줄글(설정.enhance, 4) !== 바꾼글);
      await verify('서버를 다시 켜면 바꿔 둔 강화 확률이 남지 않는다', 확률줄글((await 설정읽기(admin)).enhance, 4) === 바꾼글, false);
    });
  } finally {
    await 강화확률되돌리기(admin);
  }
});
