import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 서버규칙정리 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버규칙화면 } from './pages/rules.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-317',
  name: '「규칙」에 300자를 적고 추가하면 목록에 그 규칙이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    안글자수: z.number().int().min(20).max(300).describe('규칙 글자 수 — 20자 이상 300자 이하').default(300),
    밖글자수: z.number().int().min(301).describe('규칙 글자 수 — 301자 이상').default(301),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 규칙 = new 서버규칙화면(page);
  const 안머리 = 고유이름('mto') + '안';
  const 밖머리 = 고유이름('mto') + '밖';

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「규칙」에 300자를 적고 「규칙 추가」를 누른다', async () => {
      await 규칙.추가폼열기();
      await 규칙.규칙적고추가누르기(안머리.padEnd(params.안글자수, '가'));
      const 보인다 = await 규칙.규칙줄(안머리).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「규칙」에 300자를 적고 추가하면 목록에 그 규칙이 보인다', 보인다, true);
    });

    await test.step('「규칙」에 301자를 적고 「규칙 추가」를 누른다', async () => {
      await 규칙.추가폼열기();
      await 규칙.규칙적고추가누르기(밖머리.padEnd(params.밖글자수, '가'));
      const 오류 = await 규칙.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await 규칙.열기();
      const 없다 = await verify('규칙이 만들어지지 않는다', await 규칙.규칙줄(밖머리).count(), 0);
      await verify('「규칙」 301자의 규칙은 만들어지지 않는다', 오류 && 없다, true);
    });
  } finally {
    await 서버규칙정리(page, 안머리);
    await 서버규칙정리(page, 밖머리);
  }
});
