import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { PK공격, 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-229',
  name: '선량한 봇을 먼저 공격하면 선공 표시 만료 시각이 공격 시각부터 60초 뒤다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=보라', 'move:성향 선량→보라'],
  params: null,
  expected: z.object({
    허용오차: z.number().min(0).max(30).describe('공격 시각과 만료 시각 사이 시간의 허용 오차(초) — 0 이상 30 이하').default(2),
  }),
});

test(spec, async ({ admin, expected }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('선량한 새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa229');
      await 순간이동(admin, 나, 'Beginner');
      봇번호 = (await 선량한봇하나(admin, 나, 2))?.id ?? 0;
    });

    await test.step('선량한 캐릭터가 초록 들판에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 성향 상태가 「Innocent」다', 지금.alignment.state, 'Innocent', { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', 지금.zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('선량한 봇을 먼저 공격하고 선공 표시 만료 시각을 읽는다', async () => {
      const 응답 = await PK공격(admin, 나!, { kind: 'Character', id: 나!.id }, { kind: 'Bot', id: 봇번호 });
      const 공격 = await verify('공격 응답 코드가 200 이다', 응답.status(), 200);
      const 공격시각 = Date.parse(응답.headers()['date'] ?? '');
      const 만료 = Date.parse((await 캐릭터읽기(admin, 나!)).alignment.purpleUntil ?? '');
      const 차이 = (만료 - 공격시각) / 1000;
      const 안 = await verify('만료 시각과 공격 시각의 차이가 60초에서 허용 오차 안이다', Math.abs(차이 - 60) <= expected.허용오차, true);
      await verify('선량한 봇을 먼저 공격하면 선공 표시 만료 시각이 공격 시각부터 60초 뒤다', 공격 && 안, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
