import { defineCase, test, verify } from '@platform/kit';

import { 랜덤글, 스폰바꾸기 } from './helpers/admin.helper.js';
import { 스폰되돌리기, 스폰목록 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-574',
  name: '없는 스폰 번호로 PUT 하면 새 스폰이 생긴다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['zone:Beginner', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  const 번호 = `qafn574-${랜덤글(5)}`;
  try {
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('없는 스폰 번호로 PUT 한다', async () => {
      await 스폰바꾸기(admin, 번호, { zone: 'Beginner', monster: 'Imp', x: 110, z: 130 });
      await verify('없는 스폰 번호로 PUT 하면 새 스폰이 생긴다', (await 스폰목록(admin)).filter((s) => s.id === 번호).length, 1);
    });
    await test.step('있는 스폰 번호의 좌표를 PUT 으로 바꾼다', async () => {
      await 스폰바꾸기(admin, 번호, { zone: 'Beginner', monster: 'Imp', x: 120, z: 140 });
      const 바뀐 = (await 스폰목록(admin)).find((s) => s.id === 번호);
      await verify('있는 스폰 번호로 PUT 하면 그 스폰 좌표가 바뀐다', `${String(바뀐?.x)}, ${String(바뀐?.z)}`, '120, 140');
    });
  } finally {
    await 스폰되돌리기(admin);
  }
});
