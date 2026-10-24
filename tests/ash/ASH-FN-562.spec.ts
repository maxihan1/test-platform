import { defineCase, test, verify } from '@platform/kit';

import { 계정찾기, 랜덤글, 정리하기 } from './helpers/admin.helper.js';
import { 새계정, 캐릭터만들기 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-562',
  name: '정리를 부르면 앞머리 계정 둘과 그 캐릭터가 지워진다',
  platforms: ['android'],
  precondition: ['앞머리가 같은 새 계정 둘에 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 앞머리 = `zq${랜덤글(4)}`;
  try {
    await test.step('앞머리가 같은 새 계정 둘에 캐릭터를 하나씩 만든다', async () => {
      await 캐릭터만들기(admin, await 새계정(admin, 앞머리));
      await 캐릭터만들기(admin, await 새계정(admin, 앞머리));
    });
    await test.step('앞머리가 같은 새 계정 둘과 캐릭터를 확인한다', async () => {
      const 찾은 = await 계정찾기(admin, 앞머리);
      const 캐릭터수 = 찾은.reduce((합, 계정) => 합 + 계정.characterCount, 0);
      await verify('앞머리가 같은 새 계정 둘이 있다', 찾은.length, 2, { blocker: true });
      await verify('그 계정 둘에 캐릭터가 하나씩 있다', 캐릭터수, 2, { blocker: true });
    });
    await test.step('그 앞머리로 정리를 부른다', async () => {
      const 응답 = await 정리하기(admin, 앞머리);
      const 계정 = await verify('지운 계정이 둘이다', 응답.accountsDeleted, 2);
      const 캐릭터 = await verify('지운 캐릭터가 둘이다', 응답.charactersDeleted, 2);
      const 남은 = await verify('그 앞머리 계정이 한 건도 남지 않는다', (await 계정찾기(admin, 앞머리)).length, 0);
      await verify('정리를 부르면 앞머리 계정 둘과 그 캐릭터가 지워진다', 계정 && 캐릭터 && 남은, true);
    });
  } finally {
    await 계정지우기(admin, 앞머리);
  }
});
