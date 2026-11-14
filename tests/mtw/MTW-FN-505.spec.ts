import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 검색화면 } from './pages/search.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-505',
  name: '검색어를 넣고 Enter 를 치면 결과 화면 머리말에 「“hana”에 대한 검색」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 검색 = new 검색화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('왼쪽 열에 검색칸이 보인다', await 검색.검색칸.isVisible(), true, { blocker: true });
  });

  await test.step('검색칸에 「hana」를 넣고 Enter 를 친다', async () => {
    await 검색.찾기('hana');
    const 전부보임 = await 검색.탭('전부').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('검색어를 넣고 Enter 를 치면 결과 화면 머리말에 「“hana”에 대한 검색」이 보인다', (await 검색.결과제목.innerText()).trim(), '“hana”에 대한 검색');
    const 전부 = await verify('결과 화면에 「전부」 탭이 보인다', 전부보임, true);
    const 프로필 = await verify('결과 화면에 「프로필」 탭이 보인다', await 검색.탭('프로필').isVisible(), true);
    const 해시태그 = await verify('결과 화면에 「해시태그」 탭이 보인다', await 검색.탭('해시태그').isVisible(), true);
    const 게시물 = await verify('결과 화면에 「게시물」 탭이 보인다', await 검색.탭('게시물').isVisible(), true);
    await verify('결과 화면 탭은 「전부」 · 「프로필」 · 「해시태그」 · 「게시물」이다', 전부 && 프로필 && 해시태그 && 게시물, true);
  });
});
