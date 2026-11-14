import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 리스트상세화면 } from './pages/list-detail.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-979',
  name: '없는 리스트 주소를 열면 화면이 깨지지 않고 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 리스트상세화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 상세.열기('/lists/1');
    await verify('리스트 화면에 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('없는 리스트 번호의 주소를 연다', async () => {
    await 상세.열기('/lists/999999999');
    const 안내 = await 상세.알림.글('Record not found').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('없는 리스트 주소를 열면 화면이 깨지지 않고 안내가 보인다', 안내, true);
  });
});
