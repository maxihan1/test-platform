import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 머리로정리, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 계정찾기 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-562',
  name: '아이디 앞머리로 정리하면 그 계정과 캐릭터가 지워진다',
  platforms: ['android'],
  precondition: ['캐릭터를 가진 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('캐릭터를 가진 새 계정을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa562');
    });

    await test.step('새 계정에 캐릭터가 하나 있는지 확인한다', async () => {
      const 찾음 = (await 계정찾기(admin, 나!.아이디)).find((x) => x.username === 나!.아이디);
      await verify('새 계정의 캐릭터가 하나다', 찾음?.characterCount, 1, { blocker: true });
    });

    await test.step('그 아이디로 정리를 부른다', async () => {
      const 결과 = await 머리로정리(admin, 나!.아이디);
      const 계정수 = await verify('지워진 계정이 하나다', 결과.accountsDeleted, 1);
      const 캐릭터수 = await verify('지워진 캐릭터가 하나다', 결과.charactersDeleted, 1);
      const 사라짐 = await verify('그 아이디로 계정을 찾으면 나오지 않는다', (await 계정찾기(admin, 나!.아이디)).length, 0);
      await verify('아이디 앞머리로 정리하면 그 계정과 캐릭터가 지워진다', 계정수 && 캐릭터수 && 사라짐, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
