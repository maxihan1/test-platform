import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 사람목록화면 } from './pages/account-list.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-290',
  name: '확장 푸터의 좋아요 수를 누르면 좋아요한 사람 목록이, 부스트 수를 누르면 부스트한 사람 목록이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('hana_photo 사진 글을 찾는 낱말').default('남산 야경'),
  }),
  expected: z.object({
    좋아요제목: z.string().describe('좋아요한 사람 목록 제목에 든 글').default('좋아요'),
    부스트제목: z.string().describe('부스트한 사람 목록 제목에 든 글').default('부스트'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 목록 = new 사람목록화면(driver);

  await test.step('일반 회원으로 로그인해 hana_photo 글 상세를 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 글상세열기(driver, 'hana_photo', params.글일부);
    await verify('글 상세 확장 푸터의 좋아요 수가 보인다', await 뜰때까지(driver, 글상세.좋아요수, 15_000), true, { blocker: true });
    await verify('글 상세 확장 푸터의 부스트 수가 보인다', await 뜰때까지(driver, 글상세.부스트수, 15_000), true, { blocker: true });
  });

  await test.step('글 상세 확장 푸터의 좋아요 수와 부스트 수를 누른다', async () => {
    await driver.$(글상세.좋아요수).click();
    const 좋아요줄 = await verify('좋아요한 사람 줄이 보인다', await 목록.줄이뜰때까지(), true);
    const 좋아요 = await verify('목록 제목에 「좋아요」가 든다', (await 목록.제목읽기()).includes(expected.좋아요제목), true);
    await 목록.닫기();
    await verify('글 상세가 다시 보인다', await 글상세.그려질때까지(), true, { blocker: true });
    await driver.$(글상세.부스트수).click();
    const 부스트줄 = await verify('부스트한 사람 줄이 보인다', await 목록.줄이뜰때까지(), true);
    const 부스트 = await verify('목록 제목에 「부스트」가 든다', (await 목록.제목읽기()).includes(expected.부스트제목), true);
    await verify(
      '확장 푸터의 좋아요 수를 누르면 좋아요한 사람 목록이, 부스트 수를 누르면 부스트한 사람 목록이 열린다',
      좋아요줄 && 좋아요 && 부스트줄 && 부스트,
      true,
    );
  });
});
