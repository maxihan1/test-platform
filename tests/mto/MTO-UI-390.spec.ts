import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 이용약관초안화면 } from './pages/terms-draft.page.js';
import { 이용약관설정화면 } from './pages/terms-generate.page.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-390',
  name: '「템플릿 사용」을 누르면 「이용 약관 설정」 화면에 「생성된 이용 약관은 자동으로 게시되지 않을 것입니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 약관 = new 이용약관화면(page);
  const 초안 = new 이용약관초안화면(page);
  const 설정 = new 이용약관설정화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('「이용 약관」 화면에서 「직접 사용」을 누른다', async () => {
    await 약관.열기();
    await 약관.직접사용.click();
    await 초안.시행월.waitFor();
    const 약관칸 = await verify('초안 화면에 「이용 약관」 칸이 보인다', await 초안.약관칸.isVisible(), true);
    const 변경 = await verify('초안 화면에 「무엇이 바뀌었나요?」 칸이 보인다', await 초안.변경내용칸.isVisible(), true);
    const 시행 = await verify('초안 화면에 「시행일」 칸이 보인다', await 초안.시행연도.isVisible(), true);
    const 저장 = await verify('초안 화면에 「초안 저장」이 보인다', await 초안.초안저장.isVisible(), true);
    const 게시 = await verify('초안 화면에 「게시」가 보인다', await 초안.게시.isVisible(), true);
    await verify('「직접 사용」을 누르면 초안 화면에 「이용 약관」 · 「무엇이 바뀌었나요?」 · 「시행일」 칸과 「초안 저장」 · 「게시」가 보인다', 약관칸 && 변경 && 시행 && 저장 && 게시, true);
  });

  await test.step('「이용 약관」 화면에서 「템플릿 사용」을 누른다', async () => {
    await 약관.열기();
    const 눌렀다 = await 약관.템플릿사용누르기();
    const 안내 = 눌렀다 && (await 설정.자동게시안내.waitFor({ timeout: 10_000 }).then(() => true, () => false));
    await verify('「템플릿 사용」을 누르면 「이용 약관 설정」 화면에 「생성된 이용 약관은 자동으로 게시되지 않을 것입니다.」가 보인다', 안내, true);
  });
});
