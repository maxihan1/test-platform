import { defineCase, test, verify } from '@platform/kit';

import { 계정찾기, 랜덤글, 목록글 } from './helpers/admin.helper.js';
import { type 계정, 새계정 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-505',
  name: '어드민 계정 찾기에 prefix 를 주면 그 앞머리 계정만 온다',
  platforms: ['android'],
  precondition: ['앞머리가 같은 새 계정 둘이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 앞머리 = `qafn505${랜덤글(2)}`;
  let 첫째: 계정 | undefined;
  let 둘째: 계정 | undefined;
  try {
    await test.step('앞머리가 같은 새 계정 둘을 만든다', async () => {
      첫째 = await 새계정(admin, 앞머리);
      둘째 = await 새계정(admin, 앞머리);
    });
    await test.step('앞머리가 같은 새 계정 둘을 확인한다', async () => {
      const 찾은 = await 계정찾기(admin, 앞머리);
      await verify('앞머리가 같은 새 계정 둘이 있다', 찾은.length, 2, { blocker: true });
    });
    await test.step('그 앞머리로 계정을 찾는다', async () => {
      const 찾은 = await 계정찾기(admin, 앞머리);
      await verify('어드민 계정 찾기에 prefix 를 주면 그 앞머리 계정만 온다', 목록글(...찾은.map((a) => a.username)), 목록글(첫째!.아이디, 둘째!.아이디));
    });
  } finally {
    await 계정지우기(admin, 앞머리);
  }
});
