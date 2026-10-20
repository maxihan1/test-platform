import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 운영툴화면 } from './pages/ops.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 가입자정리하기, 로그인한아이디, 새회원정보, 회원가입, 회원로그인 } from './helpers/member.helper.js';

export const spec = defineCase({
  tcId: 'MKO-UI-127',
  name: '권한 없음 화면에서 「홈으로」를 누르면 쇼핑몰 홈(/)으로 간다',
  precondition: ['새 회원으로 로그인해 /ops 를 열었다'],
  params: z.object({}),
  expected: z.object({
    homePath: z.string().describe('쇼핑몰 홈 주소').default('/'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 회원 = 새회원정보();
  const 운영툴 = new 운영툴화면(page);
  const 홈 = new 홈화면(page);
  try {
    await test.step('새 회원을 가입시키고 로그인한다', async () => {
      await 회원가입(page, 회원);
      await 회원로그인(page, 회원);
    });

    await test.step('새 회원으로 /ops 를 열었는지 확인한다', async () => {
      await verify('로그인한 아이디가 새 회원 아이디와 같다', await 로그인한아이디(page), 회원.아이디, { blocker: true });
      await 운영툴.열기();
      await verify('「권한이 없습니다」 제목이 보인다', await 운영툴.권한없음제목.isVisible(), true, { blocker: true });
    });

    await test.step('「권한이 없습니다」 화면에서 「홈으로」를 누른다', async () => {
      await 운영툴.홈으로누르기();
      await 운영툴.권한없음제목.waitFor({ state: 'detached' });
      await 홈.그려질때까지();
      await verify('권한 없음 화면에서 「홈으로」를 누르면 쇼핑몰 홈(/)으로 간다', new URL(page.url()).pathname, expected.homePath);
    });
  } finally {
    await 가입자정리하기(page, 회원);
  }
});
