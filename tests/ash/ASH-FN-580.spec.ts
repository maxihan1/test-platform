import { defineCase, test, verify } from '@platform/kit';

import { 스폰되돌리기, 스폰목록, 응답몸, 임의글자 } from './helpers/game-state.helper.js';
import { 스폰넣기응답, 스폰지우기응답, 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-580',
  name: '스폰을 지우면 응답의 count 가 앞보다 1 적다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['monster:Imp', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 번호 = '';
  let 앞개수 = 0;
  try {
    await test.step('스폰 표를 기본 표로 되돌리고 지울 스폰 하나를 넣어 둔다', async () => {
      await 스폰되돌리기(admin);
      번호 = `zqa580_${임의글자(6)}`;
      await 스폰넣기응답(admin, 번호, { zone: 'Beginner', monster: 'Imp', x: 100, z: 150 });
    });

    await test.step('어드민 키가 있고 넣어 둔 스폰이 표에 있는지 확인한다', async () => {
      await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
      const 표 = await 스폰목록(admin);
      앞개수 = 표.length;
      await verify('넣어 둔 스폰이 표에 있다', 표.some((x) => x.id === 번호), true, { blocker: true });
    });

    await test.step('스폰 하나를 지운다', async () => {
      const 응답 = await 스폰지우기응답(admin, 번호);
      const 코드 = await verify('스폰 지우기 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ count: number }>(응답);
      const 줄음 = await verify('응답의 count 가 앞보다 1 적다', 앞개수 - 몸.count, 1);
      await verify('스폰을 지우면 응답의 count 가 앞보다 1 적다', 코드 && 줄음, true);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
