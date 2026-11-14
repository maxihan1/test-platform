import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 긴글, 내소개API, 프로필되돌리기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-593',
  name: '자기소개를 500자로 넣으면 저장할 수 있다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    소개한도: z.number().describe('자기소개 글자 수 한도').default(500),
    이름한도: z.number().describe('표시 이름 글자 수 한도').default(40),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 편집 = new 프로필편집화면(page);
  let 원래: Awaited<ReturnType<typeof 내소개API>> | undefined;

  await test.step('두 번째 사용자로 로그인하고 프로필 편집을 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    await 편집.열기();
    원래 = await 내소개API(page);
    await verify('프로필 편집 화면에 「표시되는 이름」 버튼이 보인다', await 편집.이름버튼.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('프로필 편집 「자기소개」에 500자를 넣는다', async () => {
      await 편집.소개창열기();
      await 편집.소개칸.fill(긴글(expected.소개한도));
      await verify('자기소개를 500자로 넣으면 저장할 수 있다', await 편집.창저장누르기(), 200);
    });

    await test.step('프로필 편집 「자기소개」에 501자를 넣는다', async () => {
      await 편집.소개창열기();
      await 편집.소개칸.fill(긴글(expected.소개한도 + 1));
      const 결과 = await 편집.창저장누르기();
      await verify('501자 자기소개는 저장할 수 없다', 결과 === null || 결과 >= 400, true);
      await 편집.창있으면닫기();
    });

    await test.step('프로필 편집 「표시되는 이름」에 40자를 넣는다', async () => {
      await 편집.이름창열기();
      await 편집.이름칸.fill(긴글(expected.이름한도));
      await verify('40자 표시 이름은 저장할 수 있다', await 편집.창저장누르기(), 200);
    });

    await test.step('프로필 편집 「표시되는 이름」에 41자를 넣는다', async () => {
      await 편집.이름창열기();
      await 편집.이름칸.fill(긴글(expected.이름한도 + 1));
      const 결과 = await 편집.창저장누르기();
      await verify('41자 표시 이름은 저장할 수 없다', 결과 === null || 결과 >= 400, true);
    });
  } finally {
    if (원래 !== undefined) await 프로필되돌리기API(page, 원래);
  }
});
