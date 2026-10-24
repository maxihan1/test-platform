import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, type 봇처치응답, type 캐릭터 } from './helpers/game-state.helper.js';
import { PK기록들, 봇하나처치 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-526',
  name: '어드민 PK 기록에 그 캐릭터가 처치한 줄이 있다',
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
      나 = await 새캐릭터(admin, 'zqa526');
      await 순간이동(admin, 나, 'Beginner');
      처치 = await 봇하나처치(admin, 나);
    });

    await test.step('처치한 봇이 죽었는지 확인한다', async () => {
      await verify('처치한 봇이 죽었다', 처치?.bot.isDead, true, { blocker: true });
    });

    await test.step('어드민에서 그 캐릭터의 PK 기록을 읽는다', async () => {
      const 기록 = await PK기록들(admin, 나!.id);
      await verify(
        '어드민 PK 기록에 그 캐릭터가 처치한 줄이 있다',
        기록.some((x) => x.killerKind === 'Character' && x.killerName === 나!.이름),
        true,
      );
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
