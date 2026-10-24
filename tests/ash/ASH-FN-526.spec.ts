import { defineCase, test, verify } from '@platform/kit';

import { 봇처치, 새캐릭터자리, PK기록읽기 } from './helpers/admin.helper.js';
import { 머리, 본문, type 봇, type 캐릭터 } from './helpers/api.helper.js';
import { 구역자리, 봇목록, 살아있는봇, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-526',
  name: '어드민 PK 기록을 characterId 로 받으면 그 캐릭터 기록만 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 공격자: 캐릭터 | undefined;
  let 맞는이: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터와 봇에게 죽을 캐릭터를 초록 들판에 만든다', async () => {
      공격자 = await 새캐릭터자리(admin, 'qafn526a', 'Beginner');
      맞는이 = await 새캐릭터자리(admin, 'qafn526b', 'Beginner');
    });
    await test.step('새 전사 캐릭터 둘의 자리를 확인한다', async () => {
      await verify('첫째 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 공격자!)).zone, 'Beginner', { blocker: true });
      await verify('둘째 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 맞는이!)).zone, 'Beginner', { blocker: true });
    });
    await test.step('봇과 PK 를 주고받은 뒤 어드민으로 PK 기록을 받는다', async () => {
      const 가 = 공격자!;
      const 나 = 맞는이!;
      const 처치한 = await 살아있는봇(admin, 가, 'Beginner', 'Innocent');
      await 본문(
        await request.post('/combat/pk-attack', {
          headers: 머리(가),
          data: { attackerKind: 'Character', attackerId: 가.번호, targetKind: 'Bot', targetId: 처치한.id, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
        }),
        'PK 공격',
      );
      await 본문(await 봇처치(request, 가, 처치한.id), '봇 처치');
      const 죽인 = (await 봇목록(admin, 나, 'Beginner')).find((b: 봇) => !b.isDead && b.id !== 처치한.id);
      if (죽인 === undefined) throw new Error('초록 들판에 살아 있는 다른 봇이 없다');
      await 본문(
        await request.post('/combat/player-death', {
          headers: 머리(나),
          data: { killerType: 'Bot', killerId: 죽인.id, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
        }),
        '봇에게 죽기',
      );
      const 기록 = await PK기록읽기(admin, 가);
      const 있음 = await verify('받은 PK 기록이 있다', 기록.length > 0, true);
      const 남의것 = await verify('받은 기록에 다른 캐릭터의 기록이 없다', 기록.filter((줄) => ![줄.killerName, 줄.victimName].includes(가.이름)).length, 0);
      await verify('어드민 PK 기록을 characterId 로 받으면 그 캐릭터 기록만 온다', 있음 && 남의것, true);
    });
  } finally {
    if (공격자 !== undefined) await 캐릭터지우기(admin, 공격자);
    if (맞는이 !== undefined) await 캐릭터지우기(admin, 맞는이);
  }
});
