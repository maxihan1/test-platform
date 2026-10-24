import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇목록, 봇처치, 새캐릭터, 순간이동, 오류코드, 캐릭터읽기, type 봇처치응답, type 캐릭터 } from './helpers/game-state.helper.js';
import { 봇하나처치 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-450',
  name: '죽은 봇을 처치하려 하면 409 「BOT_DEAD」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  techniques: ['동등 분할', '상태 전이'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 처치: 봇처치응답 | undefined;
  try {
    await test.step('초록 들판에 새 캐릭터를 두고 봇 하나를 처치해 죽여 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa450');
      await 순간이동(admin, 나, 'Beginner');
      처치 = await 봇하나처치(admin, 나);
    });

    await test.step('새 캐릭터가 초록 들판에 있고 처치한 봇이 죽어 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      const 그봇 = (await 봇목록(admin, 나!, 'Beginner')).find((x) => x.id === 처치?.bot.id);
      await verify('처치한 봇이 죽어 있다', 그봇?.isDead, true, { blocker: true });
    });

    await test.step('죽은 봇을 처치한다', async () => {
      const 응답 = await 봇처치(admin, 나!, 처치!.bot.id);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「BOT_DEAD」다', await 오류코드(응답), 'BOT_DEAD');
      await verify('죽은 봇을 처치하려 하면 409 「BOT_DEAD」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
