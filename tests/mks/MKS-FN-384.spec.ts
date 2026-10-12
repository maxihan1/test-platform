import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 지도화면 } from './pages/map.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-384',
  name: '「확대」를 누르면 배율이 「배율 4」로 바뀐다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 지도 = new 지도화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('오시는 길 지도를 연다', async () => {
    await 지도.열기();
  });

  await test.step('오시는 길 지도가 열렸는지 확인한다', async () => {
    await 지도.지도.waitFor();
    await verify('오시는 길 지도가 열려 있다', 경로(page), 지도화면.주소, { blocker: true });
  });

  await test.step('오시는 길 지도에서 「확대」를 누른다', async () => {
    await 지도.확대누르기(1);
    await verify('「확대」를 누르면 배율이 「배율 4」로 바뀐다', await 지도.배율.innerText(), '배율 4');
  });
});
