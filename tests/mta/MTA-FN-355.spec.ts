import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 해시태그화면 } from './pages/hashtag.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-355',
  name: '글 본문의 해시태그를 누르면 그 해시태그 타임라인이 열린다',
  platforms: ['android'],
  held: '보류 — 앱 화면에서 글 본문 해시태그 주소를 못 읽었다',
  precondition: ['일반 회원으로 로그인해 있다', '본문에 해시태그가 든 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('글쓴이의 사용자명 — 본문에 해시태그가 든 글이 있는 시드 계정').default('hana_photo'),
    글일부: z.string().min(1).describe('열 글 본문의 일부 — 해시태그가 든 글').default('남산 야경'),
  }),
  expected: z.object({
    제목글: z.string().describe('열려야 할 해시태그 타임라인 제목 — 글 본문에서 누른 해시태그').default('#오늘의사진'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 상세 = new 글상세화면(driver);
  const 화면 = new 해시태그화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('hana_photo 의 해시태그가 든 글 상세를 연다', async () => {
    await 글상세열기(driver, params.사용자명, params.글일부);
    await verify('글 상세 본문이 보인다', await 뜰때까지(driver, 상세.본문, 20_000), true, { blocker: true });
  });

  await test.step('글 상세 본문의 해시태그를 누른다', async () => {
    const 열림 = await verify('해시태그 타임라인이 열린다', await 화면.그려질때까지(), true);
    const 제목 = await verify('열린 타임라인 제목이 누른 해시태그다', 열림 ? await 화면.제목글() : '', expected.제목글);
    await verify('글 본문의 해시태그를 누르면 그 해시태그 타임라인이 열린다', 열림 && 제목, true);
  });
});
