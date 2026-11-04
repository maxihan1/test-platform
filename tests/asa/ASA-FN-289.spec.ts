import { defineCase, test, verify } from '@platform/kit';

import { 봇좌표, 봇처치, 살아있는봇들 } from './helpers/combat.helper.js';
import { 값읽기, 캐릭터읽기, 플레이어만들기, type 봇, type 성향, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-289',
  name: '선량한 봇을 처치하면 성향치가 300 내려간다',
  apiDoc: 1,
  precondition: ['성향치 0 인 캐릭터와 선량한 봇이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 대상: 봇 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 선량한 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    대상 = (await 살아있는봇들(request, 나, (b) => b.alignment.state === 'Innocent'))[0];
  });

  await test.step('성향치 0 인 캐릭터와 선량한 봇을 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 성향치가 0 이다', 지금.alignment.value, 0, {
      blocker: true,
    });
    await verify('살아 있는 선량한 봇이 있다', 대상 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('그 봇 처치를 알린다', async () => {
    if (대상 === undefined) return;
    const 응답 = await 봇처치(request, 나, 대상.id, 봇좌표(대상));
    const 값 = await 값읽기<{
      alignmentDelta?: number;
      character?: { alignment?: 성향 };
    }>(응답);
    const 변화 = await verify('봇 처치 응답의 「alignmentDelta」가 −300 이다', 값.alignmentDelta, -300);
    const 성향치 = await verify('처치한 캐릭터의 성향치가 −300 이다', 값.character?.alignment?.value, -300);
    await verify('선량한 봇을 처치하면 성향치가 300 내려간다', 변화 && 성향치, true);
  });
});
