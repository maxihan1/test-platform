import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 그림만들기, 연락처채우기 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 서버설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-286',
  name: '파비콘을 올린 뒤 「업로드한 파일 삭제」를 누르면 「사이트 업로드를 성공적으로 삭제했습니다!」가 보인다',
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

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('서버 연락처를 채워 둔다', async () => {
      await 연락처채우기(page);
    });

    await test.step('「파비콘」에 PNG 이미지를 올려 저장한 뒤 「업로드한 파일 삭제」를 누른다', async () => {
      await 설정.열기('branding');
      await 설정.파비콘.setInputFiles(그림만들기());
      await 설정.저장하기();
      await 설정.알림.글('정상적으로 변경되었습니다!').waitFor();
      await 설정.파비콘삭제.click();
      const 삭제됨 = await 설정.알림.글('사이트 업로드를 성공적으로 삭제했습니다!').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('파비콘을 올린 뒤 「업로드한 파일 삭제」를 누르면 「사이트 업로드를 성공적으로 삭제했습니다!」가 보인다', 삭제됨, true);
    });
  } finally {
    await 설정.열기('branding');
    if ((await 설정.파비콘삭제.count()) > 0) {
      await 설정.파비콘삭제.click();
      await 설정.알림.글('사이트 업로드를 성공적으로 삭제했습니다!').waitFor();
    }
  }
});
