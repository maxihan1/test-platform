import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 운영툴화면 } from './pages/ops.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 머리글 } from './components/header.component.js';
import { 가입자정리하기, 로그인한아이디, 새회원정보, 아이디사용중인가, 회원가입 } from './helpers/member.helper.js';

export const spec = defineCase({
  tcId: 'MKO-FN-010',
  name: '/ops 에서 로그인 화면으로 간 뒤 로그인하면 /ops 로 돌아온다',
  precondition: ['새 회원이 있고 로그인하지 않았다'],
  params: z.object({}),
  expected: z.object({
    opsPath: z.string().describe('돌아올 운영툴 주소').default('/ops'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 회원 = 새회원정보();
  const 운영툴 = new 운영툴화면(page);
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  try {
    await test.step('새 회원을 가입시킨다', async () => {
      await 회원가입(page, 회원);
    });

    await test.step('새 회원이 있고 로그인하지 않았는지 확인한다', async () => {
      await verify('새 회원 아이디가 사용 중이다', await 아이디사용중인가(page, 회원.아이디), true, { blocker: true });
      await verify('로그인한 회원이 없다', await 로그인한아이디(page), null, { blocker: true });
    });

    await test.step('/ops 를 열어 로그인 화면으로 간 뒤 새 회원으로 로그인한다', async () => {
      await 운영툴.열기();
      await 로그인.그려질때까지();
      await verify('로그인 화면의 「로그인」 제목이 보인다', await 로그인.제목글자(), '로그인', { blocker: true });
      await 로그인.로그인하기(회원.아이디, 회원.비밀번호);
      await 머리.로그인뒤그려질때까지();
      await verify('/ops 에서 로그인 화면으로 간 뒤 로그인하면 /ops 로 돌아온다', new URL(page.url()).pathname, expected.opsPath);
    });
  } finally {
    await 가입자정리하기(page, 회원);
  }
});
