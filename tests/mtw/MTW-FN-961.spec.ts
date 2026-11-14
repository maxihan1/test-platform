import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-961',
  name: '홈 글이 하나도 없을 때 홈을 열면 「당신의 홈 타임라인은 비어있습니다! 더 많은 사람을 팔로우하여 채워보세요.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['홈 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 풀기목록: 풀기[] = [];

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  try {
    await test.step('홈 글이 하나도 없을 때 홈을 연다', async () => {
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/home/, { 본문: [] }));
      await 홈.열기();
      await verify('홈 화면이 열려 있다', await 홈.작성.영역.isVisible(), true, { blocker: true });
      const 보인다 = await 홈.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('홈 글이 하나도 없을 때 홈을 열면 「당신의 홈 타임라인은 비어있습니다! 더 많은 사람을 팔로우하여 채워보세요.」가 보인다', 보인다, true);
    });

    await test.step('홈 응답이 준비 중일 때 홈을 연다', async () => {
      for (const 풀기함수 of 풀기목록.splice(0)) await 풀기함수();
      풀기목록.push(await 가짜응답(page, /\/api\/v1\/timelines\/home/, { 상태: 206, 본문: [] }));
      await 홈.열기();
      await verify('홈 화면이 다시 열려 있다', await 홈.작성.영역.isVisible(), true, { blocker: true });
      const 제목 = await verify('「홈 피드를 준비 중입니다…」가 보인다', await 홈.준비중제목.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 안내 = await verify('「잠시 기다려주세요.」가 보인다', await 홈.준비중안내.isVisible(), true);
      await verify('준비 중 응답에는 「홈 피드를 준비 중입니다…」와 「잠시 기다려주세요.」가 보인다', 제목 && 안내, true);
    });
  } finally {
    for (const 풀기함수 of 풀기목록) await 풀기함수();
  }
});
