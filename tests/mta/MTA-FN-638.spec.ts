import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 확인창이면취소하기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어화면 } from './pages/media-viewer.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-638',
  name: 'Android 9 이하는 「다운로드」 전에 저장소 권한을 요청하고, 막으면 「권한이 필요합니다」 / 「파일을 저장하기 위해서는 앱이 스토리지에 접근할 수 있는 권한이 필요합니다.」 / 「설정 열기」 · 「취소」 창이 뜬다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  held: '보류 — Android 9 이하 폰',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 뷰어 = new 미디어뷰어화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('Android 9 이하 폰에서 「다운로드」를 누른다', async () => {
    try {
      await 프로필열기(driver, 'hana_photo');
      await 프로필.사진누르기();
      await 뷰어.떴나();
      await 뷰어.다운로드누르기();
      const 판정1 = await verify('권한 창에 「권한이 필요합니다」가 보인다', await 문구가보이나(driver, '권한이 필요합니다'), true);
      const 판정2 = await verify('권한 창에 「파일을 저장하기 위해서는 앱이 스토리지에 접근할 수 있는 권한이 필요합니다.」가 보인다', await 문구가보이나(driver, '파일을 저장하기 위해서는 앱이 스토리지에 접근할 수 있는 권한이 필요합니다.'), true);
      const 판정3 = await verify('권한 창에 「설정 열기」가 보인다', await 문구가보이나(driver, '설정 열기'), true);
      const 판정4 = await verify('권한 창에 「취소」가 보인다', await 문구가보이나(driver, '취소'), true);
      await verify('Android 9 이하는 「다운로드」 전에 저장소 권한을 요청하고, 막으면 「권한이 필요합니다」 / 「파일을 저장하기 위해서는 앱이 스토리지에 접근할 수 있는 권한이 필요합니다.」 / 「설정 열기」 · 「취소」 창이 뜬다', 판정1 && 판정2 && 판정3 && 판정4, true);
    } finally {
      await 확인창이면취소하기(driver);
    }
  }, { capture: true });
});
