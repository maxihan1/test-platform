import { defineCase, test, verify } from '@platform/kit';

import { 봇목록, 사망알리기, 살아있는봇들, 봇좌표 } from './helpers/combat.helper.js';
import { 캐릭터읽기, 플레이어만들기, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-376',
  name: '봇이 선량한 캐릭터를 죽이면 그 봇의 성향치가 내려간다',
  apiDoc: 2,
  precondition: ['선량한 캐릭터와 살아 있는 봇이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 대상: 봇 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 살아 있는 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    대상 = (await 살아있는봇들(request, 나, (b) => b.alignment.state === 'Innocent'))[0];
  });

  await test.step('선량한 캐릭터와 살아 있는 봇을 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터가 선량하다', 지금.alignment.state, 'Innocent', {
      blocker: true,
    });
    await verify('살아 있는 봇이 있다', 대상 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('그 봇에게 죽었다고 사망을 알린다', async () => {
    if (대상 === undefined) return;
    const 전 = (await 봇목록(request, 나)).find((b) => b.id === 대상?.id)?.alignment.value;
    await 사망알리기(request, 나, 봇좌표(대상), 'Bot', 대상.id);
    const 후 = (await 봇목록(request, 나)).find((b) => b.id === 대상?.id)?.alignment.value;
    await verify('봇이 선량한 캐릭터를 죽이면 그 봇의 성향치가 내려간다', 전 !== undefined && 후 !== undefined && 후 < 전, true);
  });
});
