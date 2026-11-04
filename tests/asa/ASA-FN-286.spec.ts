import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { PK공격, 봇좌표, 살아있는봇들 } from './helpers/combat.helper.js';
import { 값읽기, 사냥터좌표, 위치옮기기, 캐릭터읽기, 플레이어만들기, type 봇, type 성향, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-286',
  name: '선량한 봇을 먼저 공격하면 「purpleUntil」이 60초 뒤다',
  apiDoc: 1,
  precondition: ['초록 들판에 선 캐릭터와 선량한 봇이 있다'],
  params: z.object({
    허용오차초: z.number().describe('60초와 견주는 허용 오차(초) — 1 이상 30 이하').default(5),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 나!: 플레이어;
  let 대상: 봇 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들어 초록 들판에 세우고 선량한 봇을 고른다', async () => {
    나 = await 플레이어만들기(request);
    await 위치옮기기(request, 나, 사냥터좌표.Beginner.x, 사냥터좌표.Beginner.z);
    대상 = (await 살아있는봇들(request, 나, (b) => b.zone === 'Beginner' && b.alignment.state === 'Innocent'))[0];
  });

  await test.step('초록 들판에 선 캐릭터와 선량한 봇을 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 구역이 「Beginner」다', 지금.zone, 'Beginner', {
      blocker: true,
    });
    await verify('살아 있는 선량한 봇이 있다', 대상 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('그 봇에게 PK 공격을 먼저 알린다', async () => {
    if (대상 === undefined) return;
    const 보낸시각 = Date.now();
    const 응답 = await PK공격(request, 나, { kind: 'Character', id: 나.캐릭터번호 }, { kind: 'Bot', id: 대상.id }, 봇좌표(대상));
    const 값 = await 값읽기<{ attacker?: Partial<성향> }>(응답);
    const 차이초 = (Date.parse(값.attacker?.purpleUntil ?? '') - 보낸시각) / 1000;
    const 견줄값 = Math.abs(차이초 - 60) <= params.허용오차초 ? 60 : 차이초;
    await verify('선량한 봇을 먼저 공격하면 「purpleUntil」이 60초 뒤다', 견줄값, 60);
  });
});
