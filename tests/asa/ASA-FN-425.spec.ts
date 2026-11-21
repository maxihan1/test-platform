import { defineCase, test, verify } from '@platform/kit';

import { 빈앞머리찾기, 앞머리계정수, 어드민정리 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-425',
  name: '2자 앞머리로 어드민 정리를 부르면 받아들여지지 않는다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['그 앞머리로 시작하는 계정이 하나도 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 두자 = '';
  let 세자 = '';

  await test.step('계정이 없는 2자 · 3자 앞머리를 고른다', async () => {
    두자 = await 빈앞머리찾기(admin, 2);
    세자 = await 빈앞머리찾기(admin, 3);
  });

  await test.step('고른 앞머리로 시작하는 계정이 없는지 확인한다', async () => {
    await verify('2자 앞머리로 시작하는 계정이 0개다', await 앞머리계정수(admin, 두자), 0, { blocker: true });
    await verify('3자 앞머리로 시작하는 계정이 0개다', await 앞머리계정수(admin, 세자), 0, { blocker: true });
  });

  await test.step('2자 앞머리로 어드민 정리를 부른다', async () => {
    const 응답 = await 어드민정리(admin, 두자);
    await verify('2자 앞머리로 어드민 정리를 부르면 받아들여지지 않는다', 응답.ok(), false);
  });

  await test.step('3자 앞머리로 어드민 정리를 부른다', async () => {
    const 응답 = await 어드민정리(admin, 세자);
    await verify('3자 앞머리로 어드민 정리를 부르면 200 이 돌아온다', 응답.status(), 200);
  });
});
