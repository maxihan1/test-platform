import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 날짜글, 며칠뒤 } from './helpers/shop.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-275',
  name: '「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 관리자 = new 관리자화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자계정.loginId, 관리자계정.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정 세션이 있다', (await 내정보(page.request)).loginId === 관리자계정.loginId, true, { blocker: true });
  });

  await test.step('「주문 내역 내려받기」를 누른다', async () => {
    await 관리자.열기();
    const 내려받는중 = page.waitForEvent('download');
    await 관리자.주문내려받기.click();
    const 내려받음 = await 내려받는중;
    const 글 = await 관리자.다운로드글(내려받음);
    await verify('「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다', 내려받음.suggestedFilename() === 'orders-' + 날짜글(며칠뒤(0)).replaceAll('-', '') + '.csv', true);
    await verify('내려받은 주문 CSV 첫 줄이 「주문번호,주문일,아이디,결제금액,상태」다', (글.replace('\uFEFF', '').split(/\r?\n/)[0] ?? '') === '주문번호,주문일,아이디,결제금액,상태', true);
  });
});
