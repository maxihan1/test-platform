import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-365',
  name: '개인정보처리방침 본문의 조 제목이 「제1조 (수집하는 개인정보 항목)」부터 「제9조 (개인정보 보호책임자)」까지 차례로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

const 조제목들 = [
  '제1조 (수집하는 개인정보 항목)',
  '제2조 (개인정보의 수집 및 이용 목적)',
  '제3조 (보유 및 이용 기간)',
  '제4조 (제3자 제공)',
  '제5조 (처리 위탁)',
  '제6조 (파기 절차 및 방법)',
  '제7조 (이용자의 권리)',
  '제8조 (안전성 확보 조치)',
  '제9조 (개인정보 보호책임자)',
];

test(spec, async ({ page }) => {
  const 방침 = new 개인정보처리방침화면(page);
  await 안내창막기(page);

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 방침.열기();
    await verify('비회원이다', await 방침.머리.로그인.isVisible(), true, { blocker: true });
    await verify('주소가 /privacy 그대로다', 방침.현재경로(), '/privacy', { blocker: true });
    await verify(
      '개인정보처리방침 본문의 조 제목이 「제1조 (수집하는 개인정보 항목)」부터 「제9조 (개인정보 보호책임자)」까지 차례로 보인다',
      (await 방침.조제목들()).join(', '),
      조제목들.join(', '),
    );
  });
});
