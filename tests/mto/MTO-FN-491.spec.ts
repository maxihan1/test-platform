import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-491',
  name: '「유행 활성화」를 끈 채 「유행하는 게시물」 주소를 열면 그 화면이 열린다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 설정 = new 서버설정화면(page);
  let 원래켜짐: boolean | undefined;

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('「발견하기」 탭의 「유행 활성화」 값을 읽어 둔다', async () => {
      await 설정.열기('discovery');
      원래켜짐 = await 설정.유행활성화.isChecked();
    });

    await test.step('「발견하기」 탭에서 「유행 활성화」를 끄고 「유행하는 게시물」 화면을 연다', async () => {
      await 설정.유행활성화.uncheck();
      await 설정.저장하기();
      await 설정.알림.글('정상적으로 변경되었습니다!').waitFor();
      await 관리.열기('/admin/trends/statuses');
      await verify('「유행 활성화」를 끈 채 「유행하는 게시물」 주소를 열면 그 화면이 열린다', await 관리.제목글(), '유행하는 게시물');
    });
  } finally {
    if (원래켜짐 !== undefined) {
      await 설정.열기('discovery');
      await 설정.유행활성화.setChecked(원래켜짐);
      await 설정.저장하기();
      await 설정.알림.글('정상적으로 변경되었습니다!').waitFor();
    }
  }
});
