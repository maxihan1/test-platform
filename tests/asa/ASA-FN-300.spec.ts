import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 봇처치, 살아있는봇들 } from './helpers/combat.helper.js';
import { 마을좌표, 오류코드읽기, 플레이어만들기, type 봇, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-300',
  name: '마을 좌표로 PK 공격을 알리면 「SAFE_ZONE」으로 막힌다',
  apiDoc: 1,
  precondition: ['초록 들판에 선량한 봇이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 대상: 봇 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 초록 들판의 선량한 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    대상 = (await 살아있는봇들(request, 나, (b) => b.zone === 'Beginner' && b.alignment.state === 'Innocent'))[0];
  });

  await test.step('초록 들판에 선량한 봇이 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('초록 들판에 살아 있는 선량한 봇이 있다', 대상 !== undefined, true, { blocker: true });
  });

  await test.step('마을 좌표로 그 봇에게 PK 공격을 알린다', async () => {
    if (대상 === undefined) return;
    const 응답 = await PK공격(request, 나, { kind: 'Character', id: 나.캐릭터번호 }, { kind: 'Bot', id: 대상.id }, 마을좌표);
    await verify('마을 좌표로 PK 공격을 알리면 「SAFE_ZONE」으로 막힌다', await 오류코드읽기(응답), 'SAFE_ZONE');
  });

  await test.step('마을 좌표로 그 봇 처치를 알린다', async () => {
    if (대상 === undefined) return;
    const 응답 = await 봇처치(request, 나, 대상.id, 마을좌표);
    await verify('마을 좌표로 봇 처치를 알리면 「SAFE_ZONE」으로 막힌다', await 오류코드읽기(응답), 'SAFE_ZONE');
  });
});
