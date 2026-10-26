import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자 } from './helpers/common-tools.helper.js';
import { 로그인한아이디, 일회용회원으로주문만들기 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-533',
  name: '취소 사유 입력칸에 200자를 적으면 200자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    사유한도안글자수: z.number().int().min(1).describe('사유 입력칸에 적는 글자 수 — 1~200').default(200),
    사유한도밖글자수: z.number().int().min(201).describe('한도를 넘겨 적는 글자 수 — 201 이상').default(201),
  }),
  expected: z.object({
    최대글자수: z.number().describe('사유 입력칸에 들어가는 최대 글자 수').default(200),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 주문상세화면(page);
  let 회원아이디 = '';
  let 주문번호 = '';

  await test.step('일회용 회원으로 로그인하고 결제완료 주문을 만든다', async () => {
    await 안내창막기(page);
    const 만듦 = await 일회용회원으로주문만들기(page);
    회원아이디 = 만듦.회원.loginId;
    주문번호 = 만듦.주문번호;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('결제완료 주문의 취소 모달에서 「기타」를 고른다', async () => {
    await 상세.열기(주문번호);
    await 상세.취소모달열기();
    await 상세.사유고르기('기타');
    await verify('취소 사유 입력칸이 보인다', await 상세.사유입력.isVisible(), true, { blocker: true });
  });

  await test.step('사유 입력칸에 200자를 적는다', async () => {
    await 상세.사유적기(글자(params.사유한도안글자수));
    await verify('취소 사유 입력칸에 200자를 적으면 200자가 다 들어간다', (await 상세.사유입력.inputValue()).length, params.사유한도안글자수);
  });

  await test.step('사유 입력칸에 201자를 적는다', async () => {
    await 상세.사유적기(글자(params.사유한도밖글자수));
    await verify('취소 사유 입력칸에 201자를 적으면 200자까지만 들어간다', (await 상세.사유입력.inputValue()).length, expected.최대글자수);
  });
});
