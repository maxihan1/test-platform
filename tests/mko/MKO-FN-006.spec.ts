import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 운영툴화면 } from './pages/ops.page.js';
import { 가입자정리하기, 로그인한아이디, 새회원정보, 회원가입, 회원로그인 } from './helpers/member.helper.js';

export const spec = defineCase({
  tcId: 'MKO-FN-006',
  name: '새 회원으로 /ops 를 열면 「권한이 없습니다」가 보인다',
  precondition: ['새 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({
    title: z.string().describe('권한 없음 화면 제목').default('권한이 없습니다'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 회원 = 새회원정보();
  const 운영툴 = new 운영툴화면(page);
  try {
    await test.step('새 회원을 가입시키고 로그인한다', async () => {
      await 회원가입(page, 회원);
      await 회원로그인(page, 회원);
    });

    await test.step('새 회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 아이디가 새 회원 아이디와 같다', await 로그인한아이디(page), 회원.아이디, { blocker: true });
    });

    await test.step('/ops 주소를 연다', async () => {
      await 운영툴.열기();
      await verify('새 회원으로 /ops 를 열면 「권한이 없습니다」가 보인다', await 운영툴.제목글자(), expected.title);
    });
  } finally {
    await 가입자정리하기(page, 회원);
  }
});
