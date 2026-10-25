import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-299',
  name: 'FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({
    없는글자: z.string().min(1).describe('어떤 질문과 답에도 없는 글자').default('zzqqxx'),
    하나만든글자: z.string().min(1).describe('질문 하나에만 들어 있는 글자').default('아이디를 바꿀'),
  }),
  expected: z.object({
    질문수: z.number().describe('검색에 맞는 것이 하나일 때 보이는 질문 수').default(1),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 고객센터화면(page);

  await test.step('비회원으로 고객센터 화면을 연다', async () => {
    await 안내창막기(page);
    await 화면.열기();
    await verify('고객센터 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('FAQ 검색칸에 어디에도 없는 글자를 적는다', async () => {
    await 화면.검색하기(params.없는글자);
    await verify('FAQ 검색에 맞는 것이 없으면 「검색 결과가 없습니다」가 보인다', await 화면.검색결과없음.isVisible(), true);
  });

  await test.step('FAQ 검색칸에 질문 하나에만 든 글자를 적는다', async () => {
    await 화면.검색하기(params.하나만든글자);
    await verify('FAQ 검색에 맞는 것이 하나면 질문 한 건이 보인다', (await 화면.질문글들()).length, expected.질문수);
  });
});
