import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 사용자명규칙폼화면 } from './pages/username-block-form.page.js';
import { 사용자명규칙목록화면 } from './pages/username-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-240',
  name: '새 사용자명 규칙을 만들면 「사용자명 규칙을 생성했습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 사용자명 규칙이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 사용자명규칙목록화면(page);
  const 폼 = new 사용자명규칙폼화면(page);
  const 단어 = 고유이름('mto');

  try {
    await test.step('Owner 계정으로 로그인하고 사용자명 규칙 만들기 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 폼.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 폼.제목.isVisible(), true, { blocker: true });
    });

    await test.step('새 사용자명 규칙을 만든다', async () => {
      await 폼.만들기(단어, '일치');
      await verify('새 사용자명 규칙을 만들면 「사용자명 규칙을 생성했습니다」가 보인다', await 목록.알림.글('사용자명 규칙을 생성했습니다').isVisible(), true);
    });

    await test.step('그 규칙 편집 화면에서 「비교 방식」을 바꿔 저장한다', async () => {
      await verify('케이스가 만든 사용자명 규칙이 있다', await 목록.규칙링크(단어).isVisible(), true, { blocker: true });
      await 목록.규칙링크(단어).click();
      await 폼.비교방식.selectOption({ label: '포함' });
      await 폼.변경저장.click();
      await verify('사용자명 규칙을 고쳐 저장한 뒤 「사용자명 규칙을 변경했습니다」가 보인다', await 목록.알림.글('사용자명 규칙을 변경했습니다').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    });
  } finally {
    await 목록.지우기(단어);
  }
});
