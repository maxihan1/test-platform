import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-124',
  name: '1:1 문의 제목 칸에 51자를 적으면 50자까지만 들어간다',
  platforms: ['desktop'],
  precondition: ['두 번째 회원으로 로그인해 있다'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 머리 = new 머리글(page);

  await test.step('두 번째 회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, 둘째아이디, params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    await 문의.열기();
    await verify('1:1 문의 화면 제목이 보인다', await 문의.제목.isVisible(), true, { blocker: true });
  });

  await test.step('1:1 문의 제목 칸에 51자를 적는다', async () => {
    await 문의.제목칸.fill('가'.repeat(51));
    await verify('1:1 문의 제목 칸에 51자를 적으면 50자까지만 들어간다', (await 문의.제목칸.inputValue()).length, 50);
  });

  await test.step('1:1 문의 제목 칸에 50자를 적는다', async () => {
    await 문의.제목칸.fill('나'.repeat(50));
    await verify('1:1 문의 제목 칸에 50자를 적으면 50자가 모두 들어간다', (await 문의.제목칸.inputValue()).length, 50);
  });

  await test.step('1:1 문의 내용 칸에 1001자를 적는다', async () => {
    await 문의.내용칸.fill('가'.repeat(1001));
    await verify('1:1 문의 내용 칸에 1001자를 적으면 1000자까지만 들어간다', (await 문의.내용칸.inputValue()).length, 1000);
  });

  await test.step('1:1 문의 내용 칸에 1000자를 적는다', async () => {
    await 문의.내용칸.fill('나'.repeat(1000));
    await verify('1:1 문의 내용 칸에 1000자를 적으면 1000자가 모두 들어간다', (await 문의.내용칸.inputValue()).length, 1000);
  });
});
