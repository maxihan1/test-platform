import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, 응답몸, type 봇처치응답, type 캐릭터 } from './helpers/game-state.helper.js';
import { PK기록읽기응답, 봇하나처치, 빠진키 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-442',
  name: 'PK 기록을 부르면 kills · deaths · alignment · records · alignmentHistory 가 있다',
  platforms: ['android'],
  precondition: ['봇을 한 번 처치한 새 캐릭터가 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 처치: 봇처치응답 | undefined;
  try {
    await test.step('봇을 한 번 처치한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa442');
      await 순간이동(admin, 나, 'Beginner');
      처치 = await 봇하나처치(admin, 나);
    });

    await test.step('처치한 봇이 죽었는지 확인한다', async () => {
      await verify('처치한 봇이 죽었다', 처치?.bot.isDead, true, { blocker: true });
    });

    await test.step('PK 기록을 부른다', async () => {
      const 응답 = await PK기록읽기응답(admin, 나!);
      const 코드 = await verify('PK 기록 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<object>(응답);
      const 칸 = await verify('PK 기록 응답에 빠진 칸이 없다', 빠진키(몸, ['kills', 'deaths', 'alignment', 'records', 'alignmentHistory']), '');
      await verify('PK 기록을 부르면 kills · deaths · alignment · records · alignmentHistory 가 있다', 코드 && 칸, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
