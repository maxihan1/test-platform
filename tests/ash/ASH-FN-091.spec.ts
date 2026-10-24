import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 몬스터처치, 새캐릭터, 스폰목록, 스폰하나, 오류코드, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-091',
  name: '스폰 표에 없는 스폰 번호로 처치를 보고하면 409 「INVALID_SPAWN」이다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa091');
    });

    await test.step('새 캐릭터가 있고 스폰 표에 쓸 번호가 없는지 확인한다', async () => {
      const 있음 = await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
      const 없음 = await verify('스폰 표에 번호 999999 가 없다', (await 스폰목록(admin)).some((s) => s.id === '999999'), false, { blocker: true });
      await verify('새 캐릭터가 있고 스폰 표에 쓸 번호가 없다', 있음 && 없음, true, { blocker: true });
    });

    await test.step('스폰 표에 없는 스폰 번호로 처치를 보고한다', async () => {
      const 스폰 = await 스폰하나(admin, 'Beginner', 'Imp');
      const 응답 = await 몬스터처치(admin, 나!, { id: '999999', monster: 스폰.monster, x: 스폰.x, z: 스폰.z });
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「INVALID_SPAWN」이다', await 오류코드(응답), 'INVALID_SPAWN');
      await verify('스폰 표에 없는 스폰 번호로 처치를 보고하면 409 「INVALID_SPAWN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
