import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-459',
  name: '남의 팔로워만 글의 부스트 메뉴를 열면 부스트가 「이 게시물은 부스트 할 수 없습니다」로 꺼져 있다',
  techniques: ['동등 분할'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);

  await test.step('두 번째 사용자로 로그인하고 yuna_locked 팔로워만 글 상세를 연다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    const 글 = await 글찾기API(page, 'yuna_locked', '팔로워에게만 쓰는 근황');
    await 상세.열기(글경로(글));
    await verify('팔로워만 글 상세에 본문이 보인다', await 상세.본문조각('팔로워에게만 쓰는 근황').isVisible(), true, { blocker: true });
  });

  await test.step('두 번째 사용자로 yuna_locked 팔로워만 글의 부스트 메뉴를 연다', async () => {
    await 상세.부스트메뉴열기();
    await verify('남의 팔로워만 글의 부스트 메뉴를 열면 부스트가 「이 게시물은 부스트 할 수 없습니다」로 꺼져 있다', await 상세.펼침.항목('이 게시물은 부스트 할 수 없습니다').isVisible(), true);
    await verify('인용은 「비공개 게시물은 인용할 수 없습니다」로 꺼져 있다', await 상세.펼침.항목('비공개 게시물은 인용할 수 없습니다').isVisible(), true);
  });
});
