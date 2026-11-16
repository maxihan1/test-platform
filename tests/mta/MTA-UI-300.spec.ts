import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 해시태그관리열기 } from './helpers/hashtag-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 해시태그관리화면 } from './pages/hashtag-manage.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-300',
  name: '「해시태그 관리」 화면 줄마다 「#」 태그 · 「개 최신 게시물」 · 해제 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다', '팔로우 중인 해시태그가 하나 이상 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    화면제목: z.string().describe('해시태그 관리 화면 제목').default('해시태그 관리'),
    요약글: z.string().describe('줄 요약에 보이는 글').default('개 최신 게시물'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 해시태그관리화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('해시태그 관리 화면을 연다', async () => {
    await verify('해시태그 관리 화면에 줄이 그려진다', await 해시태그관리열기(driver), true, { blocker: true });
  });

  await test.step('해시태그 관리 줄마다 보이는 것을 확인한다', async () => {
    const 줄수 = await 관리.개수(관리.줄제목들);
    const 줄있음 = await verify('해시태그 줄이 하나 이상 있다', 줄수 > 0, true);
    const 제목 = await verify('화면 제목이 「해시태그 관리」다', (await 관리.글들(관리.제목)).includes(expected.화면제목), true);
    const 아이콘 = await verify('줄마다 「#」 아이콘이 있다', (await 관리.개수(관리.줄아이콘들)) === 줄수, true);
    const 요약 = await verify('줄마다 「개 최신 게시물」이 보인다', (await 관리.글들(관리.줄요약들)).every((글) => 글.includes(expected.요약글)), true);
    const 해제 = await verify('줄마다 해제 버튼이 있다', (await 관리.개수(관리.해제버튼들)) === 줄수, true);
    await verify('「해시태그 관리」 화면 줄마다 「#」 태그 · 「개 최신 게시물」 · 해제 버튼이 보인다', 줄있음 && 제목 && 아이콘 && 요약 && 해제, true);
  });
});
