import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 테스트글 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록만들기화면 } from './pages/list-create.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';
import { 목록구성원화면 } from './pages/list-members.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-426',
  name: '목록 구성원 검색에 팔로우하지 않는 promo_lee 를 적으면 목록 구성원 검색은 내가 팔로우하는 사람 중에서 찾고 목록에는 내가 팔로우하는 사람만 넣을 수 있다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 목록관리화면(driver);
  const 만들기 = new 목록만들기화면(driver);
  const 구성원 = new 목록구성원화면(driver);
  const 이름 = 테스트글('목록');
  let 만듦 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
  await test.step('홈에서 목록 관리를 연다', async () => {
    await 관리.홈에서열기();
    await verify('목록 관리 화면에 「목록 만들기」 단추가 보인다', await 관리.떴나(), true, { blocker: true });
  });
  await test.step('목록 관리에서 목록 만들기 1단계를 연다', async () => {
    await 관리.만들기누르기();
    await verify('목록 만들기 1단계 화면이 보인다', await 만들기.떴나(), true, { blocker: true });
  });
    await test.step('목록 이름을 적고 「만들기」를 눌러 구성원 단계로 간다', async () => {
      await 만들기.이름적기(이름);
      await 만들기.만들기누르기();
      만듦 = true;
      await verify('목록 만들기 2단계 화면이 보인다', await 구성원.떴나(), true, { blocker: true });
    });

    await test.step('목록 구성원 검색에 팔로우하지 않는 promo_lee 를 적는다', async () => {
      await 구성원.검색하기('minjun_dev');
      const 팔로우 = await verify('내가 팔로우하는 minjun_dev 는 검색 결과에 나온다', await 구성원.계정보이나('minjun_dev'), true);
      await 구성원.검색하기('promo_lee');
      const 안팔로우 = await verify('내가 팔로우하지 않는 promo_lee 는 검색 결과에 나오지 않는다', !(await 구성원.계정보이나('promo_lee', 5_000)), true);
      await verify('목록 구성원 검색에 팔로우하지 않는 promo_lee 를 적으면 목록 구성원 검색은 내가 팔로우하는 사람 중에서 찾고 목록에는 내가 팔로우하는 사람만 넣을 수 있다', 팔로우 && 안팔로우, true);
    }, { capture: true });
  } finally {
    if (만듦) {
      await 홈으로돌아가기(driver);
      await 관리.홈에서지우기(이름);
    }
  }
});
