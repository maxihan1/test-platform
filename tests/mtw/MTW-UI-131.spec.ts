import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기API, 글지우기API, 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-131',
  name: '홈 글 카드 머리에 프로필 사진 · 표시 이름 · @핸들 · 상대 시각 · 공개 범위 아이콘이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 카드 = new 글카드목록(page);
  const 글표식 = 표식('card');
  let 글번호: string | undefined;
  let 핸들 = '';

  await test.step('일반 회원으로 로그인하고 홈에 새 글을 올려 둔다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    핸들 = (await 내계정API(page)).acct;
    글번호 = (await 글쓰기API(page, { status: `카드 머리 확인 ${글표식}`, visibility: 'public' })).id;
    await 홈.열기();
    await verify('홈에 새 글 카드가 보인다', await 카드.카드뜰때까지(글표식), true, { blocker: true });
  });

  try {
    await test.step('홈을 연다', async () => {
      const 사진 = await verify('글 카드 머리에 프로필 사진이 보인다', await 카드.프로필사진(글표식).isVisible(), true);
      const 이름 = await verify('글 카드 머리에 표시 이름이 보인다', await 카드.표시이름(글표식).isVisible(), true);
      const 아이디 = await verify('글 카드 머리에 @핸들이 보인다', await 카드.핸들(글표식, 핸들).isVisible(), true);
      const 시각 = await verify('글 카드 머리에 상대 시각이 보인다', await 카드.상대시각(글표식).isVisible(), true);
      const 아이콘 = await verify('글 카드 머리에 공개 범위 아이콘이 보인다', await 카드.공개범위아이콘(글표식).isVisible(), true);
      await verify('홈 글 카드 머리에 프로필 사진 · 표시 이름 · @핸들 · 상대 시각 · 공개 범위 아이콘이 보인다', 사진 && 이름 && 아이디 && 시각 && 아이콘, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
