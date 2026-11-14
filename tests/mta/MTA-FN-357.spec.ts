import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그타임라인화면 } from './pages/hashtag-timeline.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-357',
  name: '해시태그 「팔로우」를 누르면 버튼이 「팔로잉」으로 바뀌고 메뉴가 「# <태그> 팔로우」에서 「# <태그> 팔로우 해제」로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 태그 = new 해시태그타임라인화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('#마스토돈 해시태그 타임라인에서 「팔로우」를 누른다', async () => {
    try {
      await 태그.둘러보기에서열기('#마스토돈');
      await 태그.더보기누르기();
      const 팔로우메뉴 = await 문구가보이나(driver, '# <태그> 팔로우');
      const 처음해제메뉴 = await 문구가보이나(driver, '# <태그> 팔로우 해제', 2_000);
      await 뒤로(driver);
      await 태그.팔로우누르기();
      const 판정1 = await verify('누르기 전 메뉴에 「# <태그> 팔로우」가 있고 「# <태그> 팔로우 해제」는 없다', 팔로우메뉴 && !처음해제메뉴, true);
      const 판정2 = await verify('해시태그 타임라인에 「팔로잉」 버튼이 보인다', await 태그.글자보이나('팔로잉'), true);
      await 태그.더보기누르기();
      const 판정3 = await verify('메뉴에 「# <태그> 팔로우 해제」가 보인다', await 문구가보이나(driver, '# <태그> 팔로우 해제'), true);
      await verify('해시태그 「팔로우」를 누르면 버튼이 「팔로잉」으로 바뀌고 메뉴가 「# <태그> 팔로우」에서 「# <태그> 팔로우 해제」로 바뀐다', 판정1 && 판정2 && 판정3, true);
    } finally {
      await 뒤로(driver);
      if (await 태그.글자보이나('팔로잉', 3_000)) {
        await 태그.팔로우해제하기();
      }
    }
  }, { capture: true });
});
