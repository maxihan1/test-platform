import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-167',
  name: '검색칸을 누르면 검색 팝업에 「최근 검색」과 「검색 옵션」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 검색 = new 검색화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('왼쪽 열에 검색칸이 보인다', await 검색.검색칸.isVisible(), true, { blocker: true });
  });

  await test.step('검색칸을 누른다', async () => {
    await 검색.팝업열기();
    const 최근 = await verify('검색 팝업에 「최근 검색」이 보인다', await 검색.최근검색.isVisible(), true);
    const 옵션 = await verify('검색 팝업에 「검색 옵션」이 보인다', await 검색.검색옵션.isVisible(), true);
    await verify('검색칸을 누르면 검색 팝업에 「최근 검색」과 「검색 옵션」이 보인다', 최근 && 옵션, true);
    await verify('「검색 옵션」에 「mastodon.maxihan.com에서는 이용할 수 없습니다.」가 보인다', await 검색.팝업글('mastodon.maxihan.com에서는 이용할 수 없습니다.').isVisible(), true);
  });
});
