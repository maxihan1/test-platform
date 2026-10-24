import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇처치, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-232',
  name: '선량한 봇을 처치하면 처치자 성향치가 300 내려간다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=선량'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('선량한 새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa232');
      await 순간이동(admin, 나, 'Beginner');
      봇번호 = (await 선량한봇하나(admin, 나, 3))?.id ?? 0;
    });

    await test.step('선량한 캐릭터가 초록 들판에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 성향 상태가 「Innocent」다', 지금.alignment.state, 'Innocent', { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', 지금.zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('선량한 봇을 처치한다', async () => {
      const 앞 = (await 캐릭터읽기(admin, 나!)).alignment.value;
      const 코드 = await verify('처치 응답 코드가 200 이다', (await 봇처치(admin, 나!, 봇번호)).status(), 200);
      const 내려감 = await verify('성향치가 300 내려간다', 앞 - (await 캐릭터읽기(admin, 나!)).alignment.value, 300);
      await verify('선량한 봇을 처치하면 처치자 성향치가 300 내려간다', 코드 && 내려감, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
