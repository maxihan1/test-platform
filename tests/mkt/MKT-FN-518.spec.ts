import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-518',
  name: '이름 1자를 적으면 「이름은 2~10자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    이름1자: z.string().describe('이름 1자 — 한글 1자').default('홍'),
    이름11자: z.string().describe('이름 11자 — 한글 11자').default('가나다라마바사아자차카'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('이름 칸에 1자 「홍」을 적는다', async () => {
    await 가입.입력하기('name', params.이름1자);
    await 두프레임뒤(page);
    await verify('이름 1자를 적으면 「이름은 2~10자입니다」가 보인다', await 가입.오류문구('name').isVisible(), true);
  });

  await test.step('이름 칸에 11자를 적는다', async () => {
    await 가입.입력하기('name', params.이름11자);
    await verify('이름 칸에 11자를 적으면 10자까지만 들어간다', `${(await 가입.칸값('name')).length}자 ${await 가입.칸값('name')}`, `10자 ${params.이름11자.slice(0, 10)}`);
  });
});
