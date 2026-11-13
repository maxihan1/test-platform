import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시험계정 } from './helpers/sanction.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 계정번호 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-095',
  name: '상세 패널의 「닫기」를 누르면 패널이 닫힌다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);

  await test.step('운영자 계정으로 로그인하고 대상 계정의 상세 패널을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.상세열기(await 계정번호(page, 시험계정));
  });

  await test.step('상세 패널이 열려 있는지 확인한다', async () => {
    await verify('상세 패널에 「닫기」 버튼이 보인다', await 화면.상세닫기.isVisible(), true, { blocker: true });
  });

  await test.step('상세 패널의 「닫기」를 누른다', async () => {
    await 화면.상세닫기.click();
    const 닫혔다 = await 화면.상세패널.waitFor({ state: 'hidden', timeout: 10_000 }).then(() => true, () => false);
    await verify('상세 패널의 「닫기」를 누르면 패널이 닫힌다', 닫혔다, true);
  });
});
