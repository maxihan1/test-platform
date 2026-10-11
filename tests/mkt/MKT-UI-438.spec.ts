import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 계정값 } from './helpers/account.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-438',
  name: '개인정보처리방침 본문에 「제1조 (수집하는 개인정보 항목)」부터 「제9조 (개인정보 보호책임자)」까지 조 제목이 차례로 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 방침 = new 개인정보처리방침화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('로그인한 회원인지 확인한다', async () => {
    await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 계정.loginId, true, { blocker: true });
  });

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 방해막기(page);
    await 방침.열기();
    await 방침.제목.waitFor();
    await 방침.본문.waitFor();
    await verify(
      '개인정보처리방침 본문에 「제1조 (수집하는 개인정보 항목)」부터 「제9조 (개인정보 보호책임자)」까지 조 제목이 차례로 보인다',
      (await 방침.조제목들()).join(', '),
      [
        '제1조 (수집하는 개인정보 항목)',
        '제2조 (개인정보의 수집 및 이용 목적)',
        '제3조 (보유 및 이용 기간)',
        '제4조 (제3자 제공)',
        '제5조 (처리 위탁)',
        '제6조 (파기 절차 및 방법)',
        '제7조 (이용자의 권리)',
        '제8조 (안전성 확보 조치)',
        '제9조 (개인정보 보호책임자)',
      ].join(', '),
    );
  });
});
