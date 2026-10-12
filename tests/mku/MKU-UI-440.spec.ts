import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-440',
  name: '개인정보처리방침 본문 끝에 「부칙 이 방침은 2026년 9월 27일부터 시행합니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 방해막기(page);
    await 화면.열기();
    await 화면.제목.waitFor();
    await verify('개인정보처리방침 본문 끝에 「부칙 이 방침은 2026년 9월 27일부터 시행합니다.」가 보인다', await 화면.끝문구(), '부칙 이 방침은 2026년 9월 27일부터 시행합니다.');
  });
});
