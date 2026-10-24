import { defineCase, test, verify } from '@platform/kit';

import { PK공격, 계정지우기, 바꾸기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 선량한봇하나 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-217',
  name: '성향치가 음수이면서 선공 표시가 있는 캐릭터의 상태가 「Chaotic」이다',
  platforms: ['android'],
  precondition: ['성향치가 −10 인 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:성향=악명', 'state:성향=보라'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 봇번호 = 0;
  try {
    await test.step('성향치가 −10 인 새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa217');
      await 순간이동(admin, 나, 'Beginner');
      await 바꾸기(admin, 나, { alignment: -10 });
      봇번호 = (await 선량한봇하나(admin, 나, 0))?.id ?? 0;
    });

    await test.step('성향치가 −10 이고 초록 들판에 선량한 봇이 있는지 확인한다', async () => {
      const 지금 = await 캐릭터읽기(admin, 나!);
      await verify('성향치가 −10 이다', 지금.alignment.value, -10, { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', 지금.zone, 'Beginner', { blocker: true });
      await verify('초록 들판에 살아 있는 선량한 봇이 있다', 봇번호 !== 0, true, { blocker: true });
    });

    await test.step('선량한 봇을 먼저 공격해 선공 표시를 얻는다', async () => {
      const 응답 = await PK공격(admin, 나!, { kind: 'Character', id: 나!.id }, { kind: 'Bot', id: 봇번호 });
      const 공격 = await verify('공격 응답 코드가 200 이다', 응답.status(), 200);
      const 지금 = await 캐릭터읽기(admin, 나!);
      const 표시 = await verify('선공 표시 만료 시각이 있다', 지금.alignment.purpleUntil !== null, true);
      const 음수 = await verify('성향치가 음수다', 지금.alignment.value < 0, true);
      const 상태 = await verify('성향 상태가 「Chaotic」이다', 지금.alignment.state, 'Chaotic');
      await verify('성향치가 음수이면서 선공 표시가 있는 캐릭터의 상태가 「Chaotic」이다', 공격 && 표시 && 음수 && 상태, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
