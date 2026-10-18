import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-068',
  name: '이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('이미 가입돼 있는 아이디').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('아이디 칸에 이미 있는 아이디를 적고 「중복 확인」을 누른다', async () => {
    await 가입.입력하기('loginId', params.loginId ?? '');
    await 가입.중복확인하기();
    await verify(
      '이미 있는 아이디로 「중복 확인」을 누르면 「이미 사용 중인 아이디입니다」가 보인다',
      await 나타났나(가입.안내('loginId').getByText('이미 사용 중인 아이디입니다')),
      true,
    );
  });
});
