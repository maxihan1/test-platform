import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-474',
  name: '해결된 신고 상세를 열면 조치 「해결로 표시」 · 「컨텐츠 삭제」 · 「제한」 · 「정지」 · 「사용자 지정」이 보이지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '해결된 시드 신고(scam_park)가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 신고 = new 신고상세화면(page);
  const 목록 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인하고 해결된 신고 목록을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기('resolved=1');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('해결된 시드 신고(scam_park)가 있다', await 목록.해결카드찾기('scam_park'), true, { blocker: true });
  });

  await test.step('해결된 scam_park 신고 상세를 연다', async () => {
    await 목록.신고링크('scam_park').click();
    await 신고.제목.waitFor();
    const 해결 = await verify('「해결로 표시」가 보이지 않는다', await 신고.조치해결로표시.isVisible(), false);
    const 삭제 = await verify('「컨텐츠 삭제」가 보이지 않는다', await 신고.컨텐츠삭제.isVisible(), false);
    const 제한 = await verify('「제한」이 보이지 않는다', await 신고.제한.isVisible(), false);
    const 정지 = await verify('「정지」가 보이지 않는다', await 신고.정지.isVisible(), false);
    const 지정 = await verify('「사용자 지정」이 보이지 않는다', await 신고.사용자지정.isVisible(), false);
    await verify('해결된 신고 상세를 열면 조치 「해결로 표시」 · 「컨텐츠 삭제」 · 「제한」 · 「정지」 · 「사용자 지정」이 보이지 않는다', 해결 && 삭제 && 제한 && 정지 && 지정, true);
    await verify('해결된 신고 상세에도 「작업으로 건너뛰기」가 보인다', await 신고.작업으로건너뛰기.isVisible(), true);
  });
});
