import { defineCase, test, verify } from '@platform/kit';

import { 응답몸 } from './helpers/game-state.helper.js';
import { 빠진키, 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-553',
  name: '어드민 설정을 부르면 enhance · drop · forced 가 있다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
  });

  await test.step('어드민 설정을 부른다', async () => {
    const 응답 = await admin.get('/admin/config');
    const 코드 = await verify('어드민 설정 응답이 200 이다', 응답.status(), 200);
    const 몸 = await 응답몸<object>(응답);
    const 칸 = await verify('어드민 설정에 빠진 칸이 없다', 빠진키(몸, ['enhance', 'drop', 'forced']), '');
    await verify('어드민 설정을 부르면 enhance · drop · forced 가 있다', 코드 && 칸, true);
  });
});
