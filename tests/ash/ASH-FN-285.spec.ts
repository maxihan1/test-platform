import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 고정비우기, 봇처치, 새캐릭터, 순간이동, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-285',
  name: '부활 전의 봇을 다시 처치하려 하면 409 「BOT_DEAD」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Beginner', 'state:성향=선량', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa285');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
    });

    await test.step('새 캐릭터가 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('방금 처치한 봇을 다시 처치한다', async () => {
      const 봇 = await 산봇하나(admin, 나!, 'Beginner', 'Innocent');
      const 첫째 = await 봇처치(admin, 나!, 봇.id);
      await verify('봇을 처음 처치한 응답이 200 이다', 첫째.status(), 200, { blocker: true });
      const 응답 = await 봇처치(admin, 나!, 봇.id);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「BOT_DEAD」다', await 오류코드(응답), 'BOT_DEAD');
      await verify('부활 전의 봇을 다시 처치하려 하면 409 「BOT_DEAD」다', 코드 && 이름, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
