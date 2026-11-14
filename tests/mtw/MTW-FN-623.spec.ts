import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { apiPost } from './helpers/api.helper.js';
import { 새창열기, 표식 } from './helpers/page-setup.helper.js';
import { 해시태그화면 } from './pages/hashtag.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-623',
  name: '아직 쓰지 않은 태그 화면을 열면 「이 해시태그는 아직 사용되지 않았습니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 태그 = 표식('unused');
  let 만들었다 = false;

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('아직 쓰지 않은 해시태그를 만든다', async () => {
      const 응답 = await apiPost(page, `/api/v1/tags/${태그}/follow`);
      만들었다 = 응답.ok();
    });

    await test.step('아직 쓰지 않은 해시태그가 만들어진 것을 확인한다', async () => {
      await verify('아직 쓰지 않은 해시태그가 만들어졌다', 만들었다, true, { blocker: true });
    });

    await test.step('아직 쓰지 않은 태그 화면을 연다', async () => {
      const 손님 = await 새창열기(page);
      try {
        const 화면 = new 해시태그화면(손님.page);
        await 화면.열기(태그);
        await verify('아직 쓰지 않은 태그 화면을 열면 「이 해시태그는 아직 사용되지 않았습니다.」가 보인다', await 화면.빈안내.isVisible(), true);
      } finally {
        await 손님.창묶음.close();
      }
    });
  } finally {
    if (만들었다) await apiPost(page, `/api/v1/tags/${태그}/unfollow`);
  }
});
