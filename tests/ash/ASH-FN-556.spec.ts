import { defineCase, test, verify } from '@platform/kit';

import { 확률줄글 } from './helpers/admin.helper.js';
import { 강화확률되돌리기, 강화확률바꾸기, 설정읽기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-556',
  name: '어드민으로 강화 확률을 바꾸면 어드민 설정의 그 줄이 바뀐다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: ['rate:enhance_5'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
      await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
    });
    await test.step('어드민으로 목표 +5 강화 확률을 바꾼다', async () => {
      await 강화확률바꾸기(admin, [{ targetLevel: 5, success: 0.5, fail: 0.25, destroy: 0.25 }]);
      await verify('어드민으로 강화 확률을 바꾸면 어드민 설정의 그 줄이 바뀐다', 확률줄글((await 설정읽기(admin)).enhance, 5), '0.5 · 0.25 · 0.25');
    });
  } finally {
    await 강화확률되돌리기(admin);
  }
});
