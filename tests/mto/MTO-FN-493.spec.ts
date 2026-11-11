import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-493',
  name: '「썸네일 대체 텍스트」에 200자를 적고 저장하면 저장된다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  held: '보류 — 썸네일 대체 텍스트 칸이 화면에 없다',
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    안글자수: z.number().int().describe('한도 안 글자 수 — 썸네일 대체 텍스트 1자 이상 200자 이하'),
    밖글자수: z.number().int().describe('한도 밖 글자 수 — 썸네일 대체 텍스트 201자 이상'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);

  let 원래값: string | undefined;
  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「썸네일 대체 텍스트」에 200자를 적고 저장한다', async () => {
      await 설정.열기('branding');
      원래값 = await 설정.썸네일대체텍스트.inputValue();
      await 설정.썸네일대체텍스트.fill('가'.repeat(params.안글자수));
      await 설정.저장하기();
      const 저장됐다 = await 설정.알림.글('정상적으로 변경되었습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「썸네일 대체 텍스트」에 200자를 적고 저장하면 저장된다', 저장됐다, true);
    });

    await test.step('「썸네일 대체 텍스트」에 201자를 적고 저장한다', async () => {
      await 설정.열기('branding');
      await 설정.썸네일대체텍스트.fill('가'.repeat(params.밖글자수));
      await 설정.저장하기();
      const 오류떴다 = await 설정.오류안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('「썸네일 대체 텍스트」 201자는 저장되지 않는다', 오류떴다, true);
    });
  } finally {
    if (원래값 !== undefined) {
      await 설정.열기('branding');
      await 설정.썸네일대체텍스트.fill(원래값);
      await 설정.저장하기();
    }
  }
});
