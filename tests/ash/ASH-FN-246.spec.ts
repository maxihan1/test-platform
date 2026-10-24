import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 구역자리, 봇목록, 봇처치, 새캐릭터, 순간이동, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-246',
  name: '마을 안에서 봇을 처치하려 하면 409 「SAFE_ZONE」이고 봇이 살아 있다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 마을에 있다'],
  techniques: ['상태 전이'],
  elements: ['zone:Town', 'move:구역 마을→PK'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('선량한 새 캐릭터를 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa246');
      await 순간이동(admin, 나, 'Town');
      봇번호 = (await 선량한봇하나(admin, 나, 7))?.id ?? 0;
    });

    await test.step('선량한 캐릭터가 마을에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 성향 상태가 「Innocent」다', 지금.alignment.state, 'Innocent', { blocker: true });
      await verify('캐릭터가 마을에 있다', 지금.zone, 'Town', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('마을 안 자리를 보고하며 봇을 처치한다', async () => {
      const 응답 = await 봇처치(admin, 나!, 봇번호, 구역자리.Town);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「SAFE_ZONE」이다', await 오류코드(응답), 'SAFE_ZONE');
      const 그봇 = (await 봇목록(admin, 나!, 'Beginner')).find((x) => x.id === 봇번호);
      const 살아 = await verify('봇이 살아 있다', 그봇 !== undefined && !그봇.isDead, true);
      await verify('마을 안에서 봇을 처치하려 하면 409 「SAFE_ZONE」이고 봇이 살아 있다', 코드 && 이름 && 살아, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
