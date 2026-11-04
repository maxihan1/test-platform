import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 살아있는봇들, 봇좌표 } from './helpers/combat.helper.js';
import { 사냥터좌표, 위치옮기기, 캐릭터읽기, 플레이어만들기, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-372',
  name: '공격자도 대상도 내 캐릭터가 아닌 PK 공격을 알리면 받아들여지지 않는다',
  apiDoc: 1,
  precondition: ['초록 들판에 선 캐릭터와 봇이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 남!: 플레이어;
  let 대상: 봇 | undefined;

  await test.step('일회용 계정으로 캐릭터 둘을 만들고 내 캐릭터를 초록 들판으로 옮긴 뒤 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    남 = await 플레이어만들기(request);
    await 위치옮기기(request, 나, 사냥터좌표.Beginner.x, 사냥터좌표.Beginner.z);
    대상 = (await 살아있는봇들(request, 나, (b) => b.zone === 'Beginner'))[0];
  });

  await test.step('초록 들판에 선 캐릭터와 봇을 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0 && 남.캐릭터번호 > 0, true, { blocker: true });
    await verify('캐릭터가 초록 들판에 있다', 지금.zone, 'Beginner', {
      blocker: true,
    });
    await verify('초록 들판에 살아 있는 봇이 있다', 대상 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('봇이 남의 캐릭터를 공격했다고 PK 공격을 알린다', async () => {
    if (대상 === undefined) return;
    const 응답 = await PK공격(request, 나, { kind: 'Bot', id: 대상.id }, { kind: 'Character', id: 남.캐릭터번호 }, 봇좌표(대상));
    await verify('공격자도 대상도 내 캐릭터가 아닌 PK 공격을 알리면 받아들여지지 않는다', 응답.ok(), false);
  });
});
