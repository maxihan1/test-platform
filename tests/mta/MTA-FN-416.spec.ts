import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 글자누르기, 글자있나, 확인창이면누르기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-416',
  name: '「Add hashtag」(힌트 「Hashtag」 · 「추가」)로 소개 해시태그를 더하고 줄마다 삭제하면 「Remove hashtag?」를 묻는다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    소개해시태그: z.string().describe('소개에 더할 해시태그 — # 없이 글자와 숫자만 쓴 한 낱말').default('tcnotifprofile'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('「Add hashtag」로 해시태그를 더한 뒤 삭제를 누른다', async () => {
    try {
      await 프로필.내프로필열기();
      await 편집.열기();
      await 편집.줄누르기('Featured hashtags');
      await 편집.줄누르기('Add hashtag');
      await 편집.칸뜰때까지();
      const 힌트 = await 편집.칸글();
      await 편집.칸적기(params.소개해시태그);
      const 추가있음 = await 글자있나(driver, '추가', 3_000);
      await 글자누르기(driver, '추가');
      await 편집.삭제버튼누르기();
      const 삭제질문 = await 문구가보이나(driver, 'Remove hashtag?');
      const 판정1 = await verify('추가 입력 칸 힌트가 「Hashtag」다', 힌트, 'Hashtag');
      const 판정2 = await verify('추가 입력 창에 「추가」 버튼이 보인다', 추가있음, true);
      const 판정3 = await verify('더한 해시태그 줄의 삭제는 「Remove hashtag?」를 묻는다', 삭제질문, true);
      await verify('「Add hashtag」(힌트 「Hashtag」 · 「추가」)로 소개 해시태그를 더하고 줄마다 삭제하면 「Remove hashtag?」를 묻는다', 판정1 && 판정2 && 판정3, true);
    } finally {
      await 확인창이면누르기(driver);
      if (await 문구가보이나(driver, params.소개해시태그, 3_000)) {
        await 편집.삭제버튼누르기();
        await 확인창이면누르기(driver);
      }
    }
  }, { capture: true });
});
