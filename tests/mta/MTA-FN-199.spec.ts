import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글고정하고스낵바읽기 } from './helpers/hashtag-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 내글쓰기, 내글지우기, 표시글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-199',
  name: '고정 글이 4개일 때 새 글을 고정하면 스낵바 「게시물이 고정되었습니다.」가 보인다',
  platforms: ['android'],
  held: '보류 — 글 여러 개를 쓰고 고정하는 준비가 폰에서 케이스 한도 120초를 넘었다',
  techniques: ['경계값 분석'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다', '고정한 글이 없다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: z.object({
    고정글: z.string().describe('고정했을 때 스낵바에 보일 글').default('게시물이 고정되었습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 본문들 = Array.from({ length: 6 }, (_, 순서) => 표시글(`고정 한도 ${String(순서 + 1)}`));
  const [첫째, 둘째, 셋째, 넷째, 다섯째, 여섯째] = 본문들;
  if (!첫째 || !둘째 || !셋째 || !넷째 || !다섯째 || !여섯째) throw new Error('본문 6개를 만들지 못했다');

  await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('새 글 6개를 올린다', async () => {
      for (const 본문 of 본문들) await 내글쓰기(driver, 본문);
    });

    await test.step('글 4개를 고정한다', async () => {
      const 고정됨: boolean[] = [];
      for (const 본문 of [첫째, 둘째, 셋째, 넷째]) 고정됨.push((await 글고정하고스낵바읽기(driver, 본문, expected.고정글)) === expected.고정글);
      await verify('고정 스낵바가 매번 보인다', 고정됨.every(Boolean), true, { blocker: true });
    });

    await test.step('고정 글이 4개일 때 새 글을 고정한다', async () => {
      await verify('고정 글이 4개일 때 새 글을 고정하면 스낵바 「게시물이 고정되었습니다.」가 보인다', await 글고정하고스낵바읽기(driver, 다섯째, expected.고정글), expected.고정글);
    });

    await test.step('고정 글이 5개일 때 새 글을 고정한다', async () => {
      const 읽은글 = await 글고정하고스낵바읽기(driver, 여섯째, expected.고정글, 5_000);
      await verify('스낵바 「게시물이 고정되었습니다.」가 보이지 않는다', 읽은글 === expected.고정글, false);
    });
  } finally {
    for (const 본문 of 본문들) await 내글지우기(driver, 본문);
  }
});
