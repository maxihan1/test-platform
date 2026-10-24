import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터목록, 어드민캐릭터들, 캐릭터지우기응답 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-409',
  name: '캐릭터를 지우면 204 이고 내 캐릭터 목록에서 빠진다',
  platforms: ['android'],
  precondition: ['캐릭터 하나를 가진 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('캐릭터 하나를 가진 새 계정을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa409');
    });

    await test.step('내 캐릭터 목록에 새 캐릭터가 있는지 확인한다', async () => {
      const 목록 = await 내캐릭터목록(admin, 나!);
      await verify('내 캐릭터 목록에 새 캐릭터가 있다', 목록.some((x) => x.id === 나!.id), true, { blocker: true });
    });

    await test.step('캐릭터를 지운다', async () => {
      const 응답 = await 캐릭터지우기응답(admin, 나!);
      const 코드 = await verify('캐릭터 삭제 응답이 204 다', 응답.status(), 204);
      const 목록 = await 내캐릭터목록(admin, 나!);
      const 빠짐 = await verify('내 캐릭터 목록에 지운 캐릭터가 없다', 목록.some((x) => x.id === 나!.id), false);
      await verify('캐릭터를 지우면 204 이고 내 캐릭터 목록에서 빠진다', 코드 && 빠짐, true);
    });

    await test.step('지운 캐릭터를 어드민에서 지운 것까지 넣어 찾는다', async () => {
      const 찾음 = (await 어드민캐릭터들(admin, { name: 나!.이름, includeDeleted: true })).find((x) => x.id === 나!.id);
      await verify('지운 캐릭터는 어드민 조회에 deleted 가 true 로 남는다', 찾음?.deleted, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
