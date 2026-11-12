import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-076',
  name: '정지된 scam_park 상세에 「계정이 정지되었습니다, 그리고」로 시작하는 안내와 「정지 해제」 · 「데이터 삭제」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '정지된 시드 계정 scam_park 이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인하고 scam_park 계정 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 상세.열기(await 계정번호(page, 'scam_park'));
    await verify('정지된 시드 계정 scam_park 이 있다', (await 상세.제목.innerText()).trim(), 'scam_park', { blocker: true });
  });

  await test.step('scam_park 계정 상세를 연다', async () => {
    const 안내 = await verify('「계정이 정지되었습니다, 그리고」로 시작하는 안내가 보인다', await 상세.정지안내.isVisible(), true);
    const 해제 = await verify('「정지 해제」가 보인다', await 상세.정지해제.isVisible(), true);
    const 삭제 = await verify('「데이터 삭제」가 보인다', await 상세.데이터삭제.isVisible(), true);
    await verify('정지된 scam_park 상세에 「계정이 정지되었습니다, 그리고」로 시작하는 안내와 「정지 해제」 · 「데이터 삭제」가 보인다', 안내 && 해제 && 삭제, true);
  });
});
