import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇선공만들기, 봇처치, 산봇들, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-235',
  name: '선공 표시가 있는 봇을 처치하면 처치자 성향치가 그대로다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있고 선공 표시가 있는 봇이 있다'],
  elements: ['zone:Beginner', 'state:성향=보라'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('새 캐릭터를 초록 들판에 두고 선공 표시가 있는 봇을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa235');
      await 순간이동(admin, 나, 'Beginner');
      const 봇 = await 선량한봇하나(admin, 나, 5);
      if (봇 !== undefined) {
        봇번호 = 봇.id;
        await 봇선공만들기(admin, 나, 봇);
      }
    });

    await test.step('새 캐릭터가 초록 들판에 있고 선공 표시가 있는 봇이 있는지 확인한다', async () => {
      await verify('캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      const 보라봇 = await 산봇들(admin, 나!, 'Beginner', 'Purple');
      await verify('초록 들판에 선공 표시가 있는 봇이 있다', 보라봇.some((x) => x.id === 봇번호), true, { blocker: true });
    });

    await test.step('선공 표시가 있는 봇을 처치한다', async () => {
      const 앞 = (await 캐릭터읽기(admin, 나!)).alignment.value;
      const 코드 = await verify('처치 응답 코드가 200 이다', (await 봇처치(admin, 나!, 봇번호)).status(), 200);
      const 그대로 = await verify('성향치가 그대로다', (await 캐릭터읽기(admin, 나!)).alignment.value, 앞);
      await verify('선공 표시가 있는 봇을 처치하면 처치자 성향치가 그대로다', 코드 && 그대로, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
