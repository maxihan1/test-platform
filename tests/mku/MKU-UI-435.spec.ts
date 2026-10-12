import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-435',
  name: '이용약관 본문에 조문 제목 「제1조 (목적)」 · 「제2조 (정의)」 · 「제3조 (약관의 게시와 개정)」 · 「제4조 (회원가입)」 · 「제5조 (회원 탈퇴 및 자격 상실)」 · 「제6조 (서비스의 제공)」 · 「제7조 (서비스 이용의 제한)」 · 「제8조 (게시물의 관리)」 · 「제9조 (구매 신청 및 결제)」 · 「제10조 (청약 철회)」 · 「제11조 (면책)」 · 「제12조 (분쟁 해결)」이 차례대로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 이용약관화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('이용약관 화면을 연다', async () => {
    await 방해막기(page);
    await 화면.열기();
    await 화면.제목.waitFor();
    await verify(
      '이용약관 본문에 조문 제목 「제1조 (목적)」 · 「제2조 (정의)」 · 「제3조 (약관의 게시와 개정)」 · 「제4조 (회원가입)」 · 「제5조 (회원 탈퇴 및 자격 상실)」 · 「제6조 (서비스의 제공)」 · 「제7조 (서비스 이용의 제한)」 · 「제8조 (게시물의 관리)」 · 「제9조 (구매 신청 및 결제)」 · 「제10조 (청약 철회)」 · 「제11조 (면책)」 · 「제12조 (분쟁 해결)」이 차례대로 보인다',
      (await 화면.조문제목들()).join(', '),
      '제1조 (목적), 제2조 (정의), 제3조 (약관의 게시와 개정), 제4조 (회원가입), 제5조 (회원 탈퇴 및 자격 상실), 제6조 (서비스의 제공), 제7조 (서비스 이용의 제한), 제8조 (게시물의 관리), 제9조 (구매 신청 및 결제), 제10조 (청약 철회), 제11조 (면책), 제12조 (분쟁 해결)',
    );
  });
});
