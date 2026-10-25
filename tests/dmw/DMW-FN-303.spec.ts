import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 글자 } from './helpers/common-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-303',
  name: '문의 제목 50자로 등록하면 내 문의 내역 맨 위에 그 문의가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    제목글자수: z.number().int().min(1).describe('문의 제목 글자 수 — 1~50').default(50),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
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

  await test.step('제목 50자로 문의를 등록한다', async () => {
    const 제목 = 글자(params.제목글자수);
    await 화면.채우기({ 유형: '기타', 제목, 내용: '제목 글자 수 경계를 보는 문의 내용입니다' });
    await 화면.등록누르고_응답기다리기();
    await 알림.글('문의가 등록되었습니다').first().waitFor();
    await verify('문의 제목 50자로 등록하면 내 문의 내역 맨 위에 그 문의가 보인다', (await 화면.내역제목들.allInnerTexts())[0], 제목);
  });
});
