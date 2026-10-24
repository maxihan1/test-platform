import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM설정읽기응답, 빠진키 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-490',
  name: 'GM 설정을 부르면 강화 설정과 드랍 설정이 있다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa490');
    });

    await test.step('새 캐릭터를 어드민에서 읽을 수 있는지 확인한다', async () => {
      await verify('새 캐릭터를 어드민에서 읽을 수 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
    });

    await test.step('GM 설정을 부른다', async () => {
      const 응답 = await GM설정읽기응답(admin, 나!);
      const 코드 = await verify('GM 설정 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<object>(응답);
      const 강화 = await verify('강화 설정이 있다', 빠진키(몸, ['enhance']), '');
      const 드랍 = await verify('드랍 설정이 있다', 빠진키(몸, ['drop']), '');
      await verify('GM 설정을 부르면 강화 설정과 드랍 설정이 있다', 코드 && 강화 && 드랍, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
