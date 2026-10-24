import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기, 필드이름들 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-325',
  name: '캐릭터를 읽으면 응답 필드 이름이 모두 camelCase 다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 마을에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa325');
      await 순간이동(admin, 나, 'Town');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('캐릭터를 읽는다', async () => {
      const 응답 = await 내캐릭터읽기(admin, 나!);
      await verify('캐릭터 읽기 응답이 200 이다', 응답.status(), 200);
      const 이름들 = 필드이름들(await 응답몸<unknown>(응답));
      const 있음 = await verify('응답에 필드가 있다', 이름들.length > 0, true);
      const 어긋남 = await verify('camelCase 가 아닌 필드 이름이 없다', 이름들.filter((x) => !/^[a-z][A-Za-z0-9]*$/.test(x)).join(', '), '');
      await verify('캐릭터를 읽으면 응답 필드 이름이 모두 camelCase 다', 있음 && 어긋남, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
