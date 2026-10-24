import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 랜덤글, 서버다시켜질때까지, 스폰바꾸기, 확률줄글 } from './helpers/admin.helper.js';
import { 강화확률되돌리기, 강화확률바꾸기, 결과고정, 결과고정비우기, 설정읽기, 스폰되돌리기, 스폰목록 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-681',
  name: '서버를 다시 켜면 확률 · 결과 고정은 기본으로 돌아가고 스폰 표는 남는다',
  platforms: ['android'],
  precondition: ['확률과 결과 고정을 바꿔 두었다'],
  held: '보류 — 서버를 다시 켤 길이 없음',
  params: z.object({
    기다릴시간: z.number().int().describe('서버를 다시 켤 때까지 기다릴 시간(초)'),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 번호 = `qafn622-${랜덤글(5)}`;
  let 기본확률 = '';
  try {
    await test.step('기본 확률을 적어 두고 확률과 결과 고정과 스폰 표를 바꿔 둔다', async () => {
      await 결과고정비우기(admin);
      기본확률 = 확률줄글((await 설정읽기(admin)).enhance, 4);
      await 강화확률바꾸기(admin, [{ targetLevel: 4, success: 0.25, fail: 0.25, destroy: 0.5 }]);
      await 결과고정(admin, { enhance: ['Fail'] });
      await 스폰바꾸기(admin, 번호, { zone: 'Beginner', monster: 'Imp', x: 110, z: 130 });
    });
    await test.step('바꿔 둔 확률과 결과 고정을 확인한다', async () => {
      const 설정 = await 설정읽기(admin);
      await verify('확률을 바꿔 두었다', 확률줄글(설정.enhance, 4) !== 기본확률, true, { blocker: true });
      await verify('결과 고정을 바꿔 두었다', 설정.forced.enhance.join(', '), 'Fail', { blocker: true });
    });
    await test.step('서버를 다시 켜고 설정과 스폰 표를 받는다', async () => {
      await 서버다시켜질때까지(admin, params.기다릴시간 * 1000, (설정) => 설정.forced.enhance.length === 0);
      const 설정 = await 설정읽기(admin);
      const 확률 = await verify('강화 확률이 기본으로 돌아간다', 확률줄글(설정.enhance, 4), 기본확률);
      const 고정 = await verify('결과 고정이 기본으로 돌아간다', 설정.forced.enhance.length, 0);
      const 스폰 = await verify('스폰 표에 바꿔 둔 스폰이 남는다', (await 스폰목록(admin)).filter((s) => s.id === 번호).length, 1);
      await verify('서버를 다시 켜면 확률 · 결과 고정은 기본으로 돌아가고 스폰 표는 남는다', 확률 && 고정 && 스폰, true);
    });
  } finally {
    await 강화확률되돌리기(admin);
    await 결과고정비우기(admin);
    await 스폰되돌리기(admin);
  }
});
