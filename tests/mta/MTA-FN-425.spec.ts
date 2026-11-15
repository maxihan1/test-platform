import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 목록만들기화면열기, 목록지우기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록화면 } from './pages/lists.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-425',
  name: '목록 이름을 적고 「만들기」를 누르면 2단계에 「2개 중 2번째 단계」 · 「아직 구성원이 없습니다」 · 「완료」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    단계글: z.string().describe('목록 만들기 2단계 글').default('2개 중 2번째 단계'),
    빈글: z.string().describe('목록 만들기 2단계 글').default('아직 구성원이 없습니다'),
    완료글: z.string().describe('목록 만들기 2단계 단추 글').default('완료'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 목록 = new 목록화면(driver);
  const 이름 = 표시글('목록');
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('홈 드롭다운에서 「목록 만들기」를 연다', async () => {
      await verify('목록 만들기 1단계 화면이 열린다', await 목록만들기화면열기(driver), true, { blocker: true });
    });
    await test.step('목록 이름을 적고 「만들기」를 누른다', async () => {
      await 칸에적기(await driver.$(목록.이름칸).getElement(), 이름);
      await driver.$(목록.만들기).click();
      const 단계 = await verify('2단계에 「2개 중 2번째 단계」가 보인다', await 뜰때까지(driver, 목록.화면글(expected.단계글), 15_000), true);
      const 비었음 = await verify('2단계에 「아직 구성원이 없습니다」가 보인다', await 뜰때까지(driver, 목록.화면글(expected.빈글), 10_000), true);
      const 완료 = await verify('2단계에 「완료」가 보인다', await 뜰때까지(driver, 목록.완료, 10_000), true);
      await verify('목록 이름을 적고 「만들기」를 누르면 2단계에 「2개 중 2번째 단계」 · 「아직 구성원이 없습니다」 · 「완료」가 보인다', 단계 && 비었음 && 완료, true);
      await driver.$(목록.완료).click();
    });
  } finally {
    await 목록지우기(driver, 이름);
  }
});
