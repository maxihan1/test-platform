import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-069',
  name: '아무도 쓰지 않는 아이디로 「중복 확인」을 누르면 「사용 가능한 아이디입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: z.object({
    아이디: z.string().describe('아무도 쓰지 않는 아이디 — 영문 소문자와 숫자 4~12자, 비우면 실행마다 새로 만든다').optional(),
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

  await test.step('아이디 칸에 아무도 쓰지 않는 아이디를 적고 「중복 확인」을 누른다', async () => {
    await 가입.입력하기('loginId', params.아이디 || 새회원정보().loginId);
    await 가입.중복확인하기();
    await verify(
      '아무도 쓰지 않는 아이디로 「중복 확인」을 누르면 「사용 가능한 아이디입니다」가 보인다',
      await 나타났나(가입.안내('loginId').getByText('사용 가능한 아이디입니다')),
      true,
    );
  });
});
