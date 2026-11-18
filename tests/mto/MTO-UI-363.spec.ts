import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-363',
  name: 'troll_kim 계정 상세 「과거 처벌」에 「이 계정에는 N번의 처벌이 있었습니다.」와 처벌 카드가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '처벌 기록이 있는 시드 계정 troll_kim 이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인하고 troll_kim 계정 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 상세.열기(await 계정번호(page, 'troll_kim'));
    await verify('처벌 기록이 있는 시드 계정 troll_kim 이 있다', (await 상세.제목.innerText()).trim(), 'troll_kim', { blocker: true });
  });

  await test.step('troll_kim 계정 상세를 연다', async () => {
    const 제목 = await verify('「과거 처벌」이 보인다', await 상세.과거처벌제목.isVisible(), true);
    const 문구 = await verify('「이 계정에는 N번의 처벌이 있었습니다.」가 보인다', await 상세.처벌문구.isVisible(), true);
    const 카드 = await verify('처벌 카드가 보인다', await 상세.처벌카드들.first().isVisible(), true);
    await verify('troll_kim 계정 상세 「과거 처벌」에 「이 계정에는 N번의 처벌이 있었습니다.」와 처벌 카드가 보인다', 제목 && 문구 && 카드, true);
  });
});
