import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-222',
  name: '성향치를 0 으로 바꾸면 상태가 「Chaotic」이 아니라 「Innocent」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Town', 'state:성향=선량'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 마을에 두고 성향치를 −1 로 바꿔 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa222');
      await 순간이동(admin, 나, 'Town');
      await 바꾸기(admin, 나, { alignment: -1 });
    });

    await test.step('새 캐릭터가 마을에 있고 상태가 「Chaotic」인지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('새 캐릭터가 마을에 있다', 지금.zone, 'Town', { blocker: true });
      await verify('성향 상태가 「Chaotic」이다', 지금.alignment.state, 'Chaotic', { blocker: true });
    });

    await test.step('성향치를 0 으로 바꾼다', async () => {
      await 바꾸기(admin, 나!, { alignment: 0 });
      const 상태 = (await 캐릭터읽기(admin, 나!)).alignment.state;
      const 아님 = await verify('상태가 「Chaotic」이 아니다', 상태 !== 'Chaotic', true);
      const 선량 = await verify('상태가 「Innocent」다', 상태, 'Innocent');
      await verify('성향치를 0 으로 바꾸면 상태가 「Chaotic」이 아니라 「Innocent」다', 아님 && 선량, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
