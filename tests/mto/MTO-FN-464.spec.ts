import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-464',
  name: '정지된 계정의 조치 화면을 열면 「이 계정은 이미 정지되었습니다.」가 보이고 「정지」 선택지가 꺼져 있다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '정지된 시드 계정 scam_park 이 있다', '제한된 시드 계정 promo_lee 가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 조치 = new 조치화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('정지된 시드 계정과 제한된 시드 계정이 있는지 확인한다', async () => {
    await 상세.열기(await 계정번호(page, 'scam_park'));
    await verify('정지된 시드 계정 scam_park 이 있다', await 상세.정지해제.isVisible(), true, { blocker: true });
    await 상세.열기(await 계정번호(page, 'promo_lee'));
    await verify('제한된 시드 계정 promo_lee 가 있다', await 상세.제한해제.isVisible(), true, { blocker: true });
  });

  await test.step('scam_park 의 조치 취하기 주소를 연다', async () => {
    await 조치.열기(await 계정번호(page, 'scam_park'));
    const 배너 = await verify('「이 계정은 이미 정지되었습니다.」가 보인다', (await 조치.상태배너.innerText()).trim(), '이 계정은 이미 정지되었습니다.');
    const 꺼짐 = await verify('「정지」 선택지가 꺼져 있다', await 조치.정지.isDisabled(), true);
    await verify('정지된 계정의 조치 화면을 열면 「이 계정은 이미 정지되었습니다.」가 보이고 「정지」 선택지가 꺼져 있다', 배너 && 꺼짐, true);
  });

  await test.step('promo_lee 의 조치 취하기 주소를 연다', async () => {
    await 조치.열기(await 계정번호(page, 'promo_lee'));
    const 배너 = await verify('「이 계정은 이미 제한되었습니다.」가 보인다', (await 조치.상태배너.innerText()).trim(), '이 계정은 이미 제한되었습니다.');
    const 꺼짐 = await verify('「제한」 선택지가 꺼져 있다', await 조치.제한.isDisabled(), true);
    await verify('제한된 계정의 조치 화면에는 「이 계정은 이미 제한되었습니다.」가 보이고 「제한」 선택지가 꺼져 있다', 배너 && 꺼짐, true);
  });
});
