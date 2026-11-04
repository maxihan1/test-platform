import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 봇목록, 봇좌표, 봇처치, 살아있는봇들 } from './helpers/combat.helper.js';
import { 값읽기, 사냥터좌표, 위치옮기기, 플레이어만들기, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-292',
  name: '보라 이름 봇을 처치하면 「alignmentDelta」가 0 이다',
  apiDoc: 2,
  precondition: ['내 캐릭터를 먼저 공격해 보라 이름이 된 봇이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 대상: 봇 | undefined;
  let 보라인가: string | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 선량한 봇이 먼저 공격하게 한다', async () => {
    나 = await 플레이어만들기(request);
    await 위치옮기기(request, 나, 사냥터좌표.Beginner.x, 사냥터좌표.Beginner.z);
    대상 = (await 살아있는봇들(request, 나, (b) => b.zone === 'Beginner' && b.alignment.state === 'Innocent'))[0];
    if (대상 === undefined) return;
    await PK공격(request, 나, { kind: 'Bot', id: 대상.id }, { kind: 'Character', id: 나.캐릭터번호 }, 봇좌표(대상));
    const 지금 = (await 봇목록(request, 나, 'Beginner')).find((b) => b.id === 대상?.id);
    보라인가 = 지금?.alignment.state;
  });

  await test.step('봇이 보라 이름이 되었는지 확인한다', async () => {
    await verify('고른 선량한 봇이 있다', 대상 !== undefined, true, {
      blocker: true,
    });
    await verify('그 봇의 상태가 「Purple」이다', 보라인가, 'Purple', {
      blocker: true,
    });
  });

  await test.step('그 봇 처치를 알린다', async () => {
    if (대상 === undefined) return;
    const 값 = await 값읽기<{ alignmentDelta?: number }>(await 봇처치(request, 나, 대상.id, 봇좌표(대상)));
    await verify('보라 이름 봇을 처치하면 「alignmentDelta」가 0 이다', 값.alignmentDelta, 0);
  });
});
