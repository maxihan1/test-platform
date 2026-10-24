import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 봇정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 거부됨, 살아있는봇들 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-445',
  name: '공격자와 대상이 모두 내 캐릭터가 아니면 PK 공격이 거부된다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇들: 봇정보[] = [];
  try {
    await test.step('초록 들판에 새 캐릭터를 두고 살아 있는 봇 둘을 고른다', async () => {
      나 = await 새캐릭터(admin, 'zqa445');
      await 순간이동(admin, 나, 'Beginner');
      봇들 = await 살아있는봇들(admin, 나, 'Beginner', undefined, 2);
    });

    await test.step('새 캐릭터가 초록 들판에 있고 봇이 둘 있는지 확인한다', async () => {
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
      await verify('살아 있는 봇이 둘 이상이다', 봇들.length >= 2, true, { blocker: true });
    });

    await test.step('봇이 다른 봇을 공격했다고 보고한다', async () => {
      const 응답 = await PK공격(admin, 나!, { kind: 'Bot', id: 봇들[0]!.id }, { kind: 'Bot', id: 봇들[1]!.id });
      await verify('공격자와 대상이 모두 내 캐릭터가 아니면 PK 공격이 거부된다', 거부됨(응답), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
