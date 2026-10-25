import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-536',
  name: '문의 제목에 공백만 적고 등록하면 비웠을 때처럼 등록되지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 문의화면(page);
  const 알림 = new 토스트(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await verify('1:1 문의 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('문의 제목에 공백만 적고 「등록」을 누른다', async () => {
    const 이전 = await 화면.내역줄들.count();
    await 화면.채우기({ 유형: '기타', 제목: '   ', 내용: '제목에 공백만 적고 등록하는 문의 내용입니다' });
    await 화면.등록누르고_응답기다리기();
    await 알림.모두.first().waitFor();
    await verify('문의 제목에 공백만 적고 등록하면 비웠을 때처럼 등록되지 않는다', await 화면.내역줄들.count(), 이전);
  });
});
