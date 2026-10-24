import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 고정비우기, 사망보고, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 봇찾기, 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-319',
  name: '봇이 선량한 캐릭터를 죽이면 그 봇의 성향치가 내려간다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=선량', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('선량한 새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa319');
      await 순간이동(admin, 나, 'Beginner');
      await 고정비우기(admin);
    });

    await test.step('새 캐릭터가 선량하고 초록 들판에 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('새 캐릭터가 선량하다', 지금.alignment.state, 'Innocent', { blocker: true });
      await verify('새 캐릭터가 초록 들판에 있다', 지금.zone, 'Beginner', { blocker: true });
    });

    await test.step('선량한 봇에게 죽었다고 보고한다', async () => {
      const 봇 = await 산봇하나(admin, 나!, 'Beginner', 'Innocent');
      const 앞 = 봇.alignment.value;
      const 응답 = await 사망보고(admin, 나!, { killerType: 'Bot', killerId: String(봇.id) });
      await verify('사망 보고 응답이 200 이다', 응답.status(), 200);
      const 뒤 = (await 봇찾기(admin, 나!, 봇.id))?.alignment.value;
      await verify('봇이 선량한 캐릭터를 죽이면 그 봇의 성향치가 내려간다', 뒤 !== undefined && 뒤 < 앞, true);
    });
  } finally {
    await 고정비우기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
