import { defineCase, test, verify } from '@platform/kit';

import { 스폰되돌리기, 스폰목록 } from './helpers/game-state.helper.js';
import { 스폰지우기응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-583',
  name: '스폰 표를 되돌리면 count 가 49 다',
  platforms: ['android'],
  precondition: ['스폰 하나를 지운 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 앞개수 = 0;
  try {
    await test.step('스폰 표를 기본 표로 되돌리고 스폰 하나를 지운다', async () => {
      await 스폰되돌리기(admin);
      const 표 = await 스폰목록(admin);
      앞개수 = 표.length;
      await 스폰지우기응답(admin, 표[표.length - 1]!.id);
    });

    await test.step('스폰 표에서 스폰 하나가 지워졌는지 확인한다', async () => {
      await verify('스폰 표가 지우기 전보다 하나 줄었다', 앞개수 - (await 스폰목록(admin)).length, 1, { blocker: true });
    });

    await test.step('스폰 표를 되돌린다', async () => {
      const 결과 = await 스폰되돌리기(admin);
      await verify('스폰 표를 되돌리면 count 가 49 다', 결과.count, 49);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
