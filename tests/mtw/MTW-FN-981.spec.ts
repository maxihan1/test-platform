import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정채운컬렉션만들기API } from './helpers/account-api.helper.js';
import { apiDelete } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 컬렉션만들기화면 } from './pages/collection-new.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-981',
  name: '컬렉션에 계정을 25개 넣으면 더 넣을 수 없다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다', '계정 25개를 넣은 컬렉션이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 컬렉션만들기화면(page);
  let 번호 = '';

  await test.step('일반 회원으로 로그인하고 계정 25개를 넣은 컬렉션을 만든다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 만든것 = await 계정채운컬렉션만들기API(page, `한도 ${표식('col')}`.slice(0, 40), 25);
    번호 = 만든것.번호;
    await verify('계정 25개를 넣은 컬렉션이 만들어졌다', 만든것.넣은수, 25, { blocker: true });
  });

  try {
    await test.step('컬렉션 편집 화면을 열고 26번째 계정을 넣으려 한다', async () => {
      await 화면.편집열기(번호);
      await verify('편집 화면에 「계정 25/25개」가 보인다', await 화면.계정수.innerText(), '계정 25/25개', { blocker: true });
      await verify('컬렉션에 계정을 25개 넣으면 더 넣을 수 없다', await 화면.검색칸.isDisabled(), true);
    });
  } finally {
    if (번호 !== '') await apiDelete(page, `/api/v1/collections/${번호}`);
  }
});
