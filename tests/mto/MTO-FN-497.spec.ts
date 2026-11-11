import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 이용약관화면 } from './pages/terms.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-497',
  name: '이용 약관이 없을 때 「이용 약관」 화면을 열면 「현재 설정된 이용약관이 없습니다.」와 「직접 사용」 · 「템플릿 사용」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '게시된 이용 약관이 없다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 약관 = new 이용약관화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 관리.열기('/admin/dashboard');
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
  });

  await test.step('게시된 이용 약관이 없는지 확인한다', async () => {
    await 약관.열기();
    await verify('게시된 이용 약관이 없다', await 약관.없음안내.isVisible(), true, { blocker: true });
  });

  await test.step('「이용 약관」 화면을 연다', async () => {
    await 약관.열기();
    const 안내 = await verify('「현재 설정된 이용약관이 없습니다.」가 보인다', await 약관.없음안내.isVisible(), true);
    const 직접 = await verify('「직접 사용」이 보인다', await 약관.직접사용.isVisible(), true);
    const 템플릿 = await verify('「템플릿 사용」이 보인다', await 약관.템플릿사용.isVisible(), true);
    await verify('이용 약관이 없을 때 「이용 약관」 화면을 열면 「현재 설정된 이용약관이 없습니다.」와 「직접 사용」 · 「템플릿 사용」이 보인다', 안내 && 직접 && 템플릿, true);
  });
});
