import { defineCase, test, verify } from '@platform/kit';

import { 스폰되돌리기, 스폰목록, 임의글자 } from './helpers/game-state.helper.js';
import { 스폰넣기응답, 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-574',
  name: '없는 번호로 스폰을 넣으면 생기고 같은 번호로 다시 넣으면 고쳐진다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['monster:Imp', 'zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 번호 = '';
  try {
    await test.step('스폰 표를 기본 표로 되돌리고 없는 번호를 정한다', async () => {
      await 스폰되돌리기(admin);
      번호 = `zqa574_${임의글자(6)}`;
    });

    await test.step('어드민 키가 있고 정한 번호의 스폰이 없는지 확인한다', async () => {
      await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
      await verify('정한 번호의 스폰이 표에 없다', (await 스폰목록(admin)).some((x) => x.id === 번호), false, { blocker: true });
    });

    await test.step('없는 번호로 스폰을 넣고 같은 번호로 다시 고친다', async () => {
      const 넣음 = await verify('스폰 넣기 응답이 성공이다', (await 스폰넣기응답(admin, 번호, { zone: 'Beginner', monster: 'Imp', x: 100, z: 150 })).ok(), true);
      const 생김 = await verify('정한 번호의 스폰이 표에 하나 생긴다', (await 스폰목록(admin)).filter((x) => x.id === 번호).length, 1);
      const 다시넣음 = await verify('같은 번호로 다시 넣는 응답이 성공이다', (await 스폰넣기응답(admin, 번호, { zone: 'Beginner', monster: 'Imp', x: 110, z: 160 })).ok(), true);
      const 목록 = (await 스폰목록(admin)).filter((x) => x.id === 번호);
      const 하나 = await verify('같은 번호의 스폰이 하나뿐이다', 목록.length, 1);
      const 고쳐짐 = await verify('스폰 X 가 110 으로 고쳐진다', 목록[0]?.x, 110);
      await verify('없는 번호로 스폰을 넣으면 생기고 같은 번호로 다시 넣으면 고쳐진다', 넣음 && 생김 && 다시넣음 && 하나 && 고쳐짐, true);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
