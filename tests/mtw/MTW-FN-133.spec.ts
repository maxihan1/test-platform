import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글지우기API } from './helpers/api.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-133',
  name: '실시간 피드 「이 서버」를 열어 둔 채 공개 글을 게시하면 새로고침 없이 목록 맨 위에 그 글이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    글머리: z.string().min(1).max(400).describe('게시할 글 앞부분 — 400자 이하 아무 글').default('실시간 피드 확인 글'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 피드 = new 실시간피드화면(page);
  const 표 = 표식('live');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('실시간 피드 「이 서버」를 연다', async () => {
    await 피드.열기();
    await verify('실시간 피드에 작성 상자가 보인다', await 피드.작성.영역.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('실시간 피드 「이 서버」를 열어 둔 채 작성 상자로 공개 글을 게시한다', async () => {
      await 피드.작성.쓰기(`${params.글머리} ${표}`);
      글번호 = (await 피드.작성.게시하기()).id;
      const 보인다 = await 피드.글(표).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 목록 = await verify('목록에 그 글이 보인다', 보인다, true);
      const 맨위 = await verify('그 글이 목록 맨 위에 있다', (await 피드.첫글.innerText()).includes(표), true);
      await verify('실시간 피드 「이 서버」를 열어 둔 채 공개 글을 게시하면 새로고침 없이 목록 맨 위에 그 글이 보인다', 목록 && 맨위, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
