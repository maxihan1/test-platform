import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 칸들 } from './helpers/admin.helper.js';
import { 설정읽기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-553',
  name: '어드민 설정을 받으면 enhance · drop · forced 세 칸이 온다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
  });
  await test.step('어드민 설정을 받는다', async () => {
    await verify('어드민 설정을 받으면 enhance · drop · forced 세 칸이 온다', 칸들(await 설정읽기(admin)), 목록글('enhance', 'drop', 'forced'));
  });
});
