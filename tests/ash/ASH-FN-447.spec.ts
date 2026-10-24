import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { 머리, type 캐릭터, 캐릭터만들기 } from './helpers/api.helper.js';
import { 구역자리, 순간이동, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-447',
  name: '내 캐릭터가 없는 pk-attack 은 받아들여지지 않는다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있는 계정과 새 캐릭터 둘이 있는 남의 계정이 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 캐릭터 | undefined;
  let 남: 캐릭터 | undefined;
  let 남의둘째: 캐릭터 | undefined;
  try {
    await test.step('두 계정에 새 캐릭터를 하나씩 초록 들판에 만든다', async () => {
      나 = await 새캐릭터자리(admin, 'qafn447a', 'Beginner');
      남 = await 새캐릭터자리(admin, 'qafn447b', 'Beginner');
    });
    await test.step('남의 계정에 대상으로 쓸 캐릭터를 하나 더 만든다', async () => {
      남의둘째 = await 캐릭터만들기(admin, 남!);
      await 순간이동(admin, 남의둘째, 'Beginner');
    });
    await test.step('두 계정의 새 캐릭터를 확인한다', async () => {
      const 내것 = (await 캐릭터읽기(admin, 나!)).id === 나!.번호;
      const 남것 = (await 캐릭터읽기(admin, 남!)).id === 남!.번호;
      await verify('새 캐릭터가 있는 계정과 새 캐릭터 둘이 있는 남의 계정이 있다', 내것 && 남것, true, { blocker: true });
    });
    await test.step('남의 캐릭터 둘을 공격자와 대상으로 pk-attack 을 보낸다', async () => {
      const 응답 = await request.post('/combat/pk-attack', {
        headers: 머리(나!),
        data: { attackerKind: 'Character', attackerId: 남!.번호, targetKind: 'Character', targetId: 남의둘째!.번호, x: 구역자리.Beginner.x, z: 구역자리.Beginner.z },
      });
      await verify('내 캐릭터가 없는 pk-attack 은 받아들여지지 않는다', 응답.ok(), false);
    });
  } finally {
    if (나 !== undefined) await 캐릭터지우기(admin, 나);
    if (남 !== undefined) await 캐릭터지우기(admin, 남);
  }
});
