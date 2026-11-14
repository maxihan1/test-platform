import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 부스트한사람화면 } from './pages/boosted-by.page.js';
import { 좋아요한사람화면 } from './pages/liked-by.page.js';
import { 인용한글화면 } from './pages/quoted-by.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-443',
  name: '부스트한 사람이 없는 글의 부스트 화면을 열면 「아직 아무도 이 게시물을 부스트하지 않았습니다. 부스트 한 사람들이 여기에 표시 됩니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['부스트 · 좋아요 · 인용이 없는 내 새 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 부스트화면 = new 부스트한사람화면(page);
  const 좋아요화면 = new 좋아요한사람화면(page);
  const 인용화면 = new 인용한글화면(page);
  let 글번호: string | undefined;
  let 경로 = '';

  await test.step('일반 회원으로 로그인하고 반응이 없는 새 글을 만든다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글쓰기API(page, { status: `반응 없는 글 ${표식('none')}`, visibility: 'public' });
    글번호 = 글.id;
    경로 = 글경로(글);
    await verify('새 글의 주소가 있다', 경로.length > 0, true, { blocker: true });
  });

  try {
    await test.step('그 글의 부스트한 사람 화면을 연다', async () => {
      await 부스트화면.열기(경로);
      const 떴다 = await 부스트화면.안내('아직 아무도 이 게시물을 부스트하지 않았습니다. 부스트 한 사람들이 여기에 표시 됩니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('부스트한 사람이 없는 글의 부스트 화면을 열면 「아직 아무도 이 게시물을 부스트하지 않았습니다. 부스트 한 사람들이 여기에 표시 됩니다.」가 보인다', 떴다, true);
    });

    await test.step('그 글의 좋아요한 사람 화면을 연다', async () => {
      await 좋아요화면.열기(경로);
      const 떴다 = await 좋아요화면.안내('아직 아무도 이 게시물에 좋아요를 표시하지 않았습니다. 누군가 좋아요를 표시하면 여기서 확인할 수 있습니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('좋아요 화면 안내는 「아직 아무도 이 게시물에 좋아요를 표시하지 않았습니다.」로 시작한다', 떴다, true);
    });

    await test.step('그 글의 인용한 글 화면을 연다', async () => {
      await 인용화면.열기(경로);
      const 떴다 = await 인용화면.안내('아직 아무도 이 게시물을 인용하지 않았습니다. 누군가 인용한다면 여기에 표시됩니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('인용 화면 안내는 「아직 아무도 이 게시물을 인용하지 않았습니다.」로 시작한다', 떴다, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});
