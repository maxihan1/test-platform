import { defineCase, test, verify } from '@platform/kit';

import { 스폰되돌리기, 스폰목록, 임의글자 } from './helpers/game-state.helper.js';
import { 거부됨, 스폰넣기응답, 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-577',
  name: '마을 구역으로 스폰을 넣으려 하면 거부되고 스폰이 생기지 않는다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['monster:Imp', 'zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 번호 = '';
  try {
    await test.step('스폰 표를 기본 표로 되돌리고 없는 번호를 정한다', async () => {
      await 스폰되돌리기(admin);
      번호 = `zqa577_${임의글자(6)}`;
    });

    await test.step('어드민 키가 있고 정한 번호의 스폰이 없는지 확인한다', async () => {
      await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
      await verify('정한 번호의 스폰이 표에 없다', (await 스폰목록(admin)).some((x) => x.id === 번호), false, { blocker: true });
    });

    await test.step('마을 구역으로 스폰을 넣는다', async () => {
      const 응답 = await 스폰넣기응답(admin, 번호, { zone: 'Town', monster: 'Imp', x: 200, z: 40 });
      const 거부 = await verify('스폰 넣기 요청이 거부된다', 거부됨(응답), true);
      const 없음 = await verify('정한 번호의 스폰이 표에 없다', (await 스폰목록(admin)).some((x) => x.id === 번호), false);
      await verify('마을 구역으로 스폰을 넣으려 하면 거부되고 스폰이 생기지 않는다', 거부 && 없음, true);
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
