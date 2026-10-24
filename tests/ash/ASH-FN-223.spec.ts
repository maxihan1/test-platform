import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 계정지우기, 새캐릭터, 순간이동, 응답몸, 캐릭터읽기, type 성향, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-223',
  name: '선량한 봇을 먼저 공격하면 공격자 상태가 「Purple」이다',
  platforms: ['android'],
  precondition: ['선량한 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=보라', 'move:성향 선량→보라'],
  params: null,
  expected: null,
});

interface 공격응답 {
  attacker: 성향;
  attackerBecamePurple: boolean;
}

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('선량한 새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa223');
      await 순간이동(admin, 나, 'Beginner');
      봇번호 = (await 선량한봇하나(admin, 나, 1))?.id ?? 0;
    });

    await test.step('선량한 캐릭터가 초록 들판에 있고 선량한 봇이 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 성향 상태가 「Innocent」다', 지금.alignment.state, 'Innocent', { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', 지금.zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('선량한 봇을 먼저 공격한다', async () => {
      const 응답 = await PK공격(admin, 나!, { kind: 'Character', id: 나!.id }, { kind: 'Bot', id: 봇번호 });
      const 코드 = await verify('공격 응답 코드가 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<공격응답>(응답);
      const 응답상태 = await verify('응답의 공격자 상태가 「Purple」이다', 몸.attacker.state, 'Purple');
      const 서버상태 = await verify('서버의 캐릭터 상태가 「Purple」이다', (await 캐릭터읽기(admin, 나!)).alignment.state, 'Purple');
      await verify('선량한 봇을 먼저 공격하면 공격자 상태가 「Purple」이다', 코드 && 응답상태 && 서버상태, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
