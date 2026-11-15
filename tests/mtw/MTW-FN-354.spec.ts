import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { PNG만들기, 소리있는영상 } from './helpers/media.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-354',
  name: '이미지가 첨부된 작성 상자에 영상을 더하고 「게시」를 누르면 「이미 사진이 첨부된 게시물엔 동영상을 첨부할 수 없습니다.」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);
  const 올린글: string[] = [];

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열고설정받기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('이미지를 첨부한 작성 상자에 영상 파일을 더하고 「게시」를 누른다', async () => {
      await 글쓰기.이미지넣기(await PNG만들기(page, '먼저.png', 64, 64, true), 1);
      await 글쓰기.이미지넣기(소리있는영상('뒤에.mp4'), 2);
      const 결과 = await 글쓰기.대체텍스트없이게시하기();
      if (결과.글번호 !== undefined) 올린글.push(결과.글번호);
      const 떴다 = await 글쓰기.알림.글('이미 사진이 첨부된 게시물엔 동영상을 첨부할 수 없습니다.').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('이미지가 첨부된 작성 상자에 영상을 더하고 「게시」를 누르면 「이미 사진이 첨부된 게시물엔 동영상을 첨부할 수 없습니다.」가 보인다', 떴다, true);
    });
  } finally {
    for (const 번호 of 올린글) await 글지우기API(page, 번호);
  }
});
