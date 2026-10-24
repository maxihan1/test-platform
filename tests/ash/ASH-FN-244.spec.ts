import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 계정지우기, 구역자리, 새캐릭터, 순간이동, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-244',
  name: '마을 안에서 PK 공격을 하면 409 「SAFE_ZONE」이다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 마을에 있다'],
  elements: ['zone:Town', 'move:구역 마을→PK'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('선량한 새 캐릭터를 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa244');
      await 순간이동(admin, 나, 'Town');
      봇번호 = (await 선량한봇하나(admin, 나, 6))?.id ?? 0;
    });

    await test.step('선량한 캐릭터가 마을에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 성향 상태가 「Innocent」다', 지금.alignment.state, 'Innocent', { blocker: true });
      await verify('캐릭터가 마을에 있다', 지금.zone, 'Town', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('마을 안 자리를 보고하며 선량한 봇을 공격한다', async () => {
      const 응답 = await PK공격(admin, 나!, { kind: 'Character', id: 나!.id }, { kind: 'Bot', id: 봇번호 }, 구역자리.Town);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「SAFE_ZONE」이다', await 오류코드(응답), 'SAFE_ZONE');
      await verify('마을 안에서 PK 공격을 하면 409 「SAFE_ZONE」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
