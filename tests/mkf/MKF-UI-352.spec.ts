import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 조항제목들 } from './helpers/policy-text.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-352',
  name: '개인정보처리방침 본문에 「제1조 (수집하는 개인정보 항목)」부터 「제9조 (개인정보 보호책임자)」까지 9개 조항 제목이 차례로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 개인정보처리방침화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('개인정보처리방침 화면 /privacy 를 연다', async () => {
    await 방해막기(page);
    await 화면.열기();
    await 화면.제목.waitFor();
    await verify(
      '개인정보처리방침 본문에 「제1조 (수집하는 개인정보 항목)」부터 「제9조 (개인정보 보호책임자)」까지 9개 조항 제목이 차례로 보인다',
      await 조항제목들(화면.본문),
      '제1조 (수집하는 개인정보 항목), 제2조 (개인정보의 수집 및 이용 목적), 제3조 (보유 및 이용 기간), 제4조 (제3자 제공), 제5조 (처리 위탁), 제6조 (파기 절차 및 방법), 제7조 (이용자의 권리), 제8조 (안전성 확보 조치), 제9조 (개인정보 보호책임자)',
    );
  });
});
