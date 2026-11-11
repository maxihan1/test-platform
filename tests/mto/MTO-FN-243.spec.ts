import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기 } from './helpers/account.helper.js';
import { 고유이름 } from './helpers/api.helper.js';
import { 가입시도, 변형아이디, 사용자명규칙만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 사용자명규칙목록화면 } from './pages/username-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-243',
  name: '규칙 단어를 대문자와 비슷한 숫자로 바꾼 아이디로 가입하면 가입이 되지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 「포함」 · 「가입 차단」으로 만든 사용자명 규칙이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 사용자명규칙목록화면(page);
  const 계정목록 = new 계정목록화면(page);
  const 단어 = `${고유이름('mto')}ae`;
  const 가입아이디 = 변형아이디(단어);

  try {
    await test.step('Owner 계정으로 로그인하고 「포함」 · 「가입 차단」 규칙을 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 사용자명규칙만들기(page, 단어, '포함');
      await 목록.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 「포함」 · 「가입 차단」으로 만든 사용자명 규칙이 있다', await 목록.행에글(단어, '가입 차단').isVisible(), true, { blocker: true });
    });

    await test.step('로그아웃한 창에서 규칙 단어를 대문자와 「4」 · 「3」으로 바꾼 아이디로 가입한다', async () => {
      const 시도 = await 가입시도(page, 가입아이디, `${고유이름('mto')}@maxihan.com`);
      try {
        const 오류 = await verify('가입 화면에 오류가 보인다', await 시도.화면.오류안내.first().isVisible(), true);
        await 계정목록.아이디로찾기(가입아이디);
        const 없음 = await verify('그 아이디의 계정이 없다', await 계정목록.행(가입아이디).count(), 0);
        await verify('규칙 단어를 대문자와 비슷한 숫자로 바꾼 아이디로 가입하면 가입이 되지 않는다', 오류 && 없음, true);
      } finally {
        await 시도.창.context().close();
      }
    });
  } finally {
    await 계정지우기(page, 가입아이디);
    await 목록.지우기(단어);
  }
});
