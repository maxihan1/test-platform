import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 프로필책자화면 } from './pages/directory.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-326',
  name: '프로필 책자 버튼 반응',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 책자 = new 프로필책자화면(page);

  await test.step('프로필 책자에서 「새로운 사람들」 다음 「최근 활동」을 누른다', async () => {
    await 한국어로(page);
    await 책자.열기();
    await 책자.필터누르기('새로운 사람들');
    await 책자.필터누르기('최근 활동');
    await verify('프로필 책자에서 「최근 활동」을 누르면 주소에 order=active 가 붙는다', new URL(page.url()).searchParams.get('order'), 'active');
  });

  await test.step('프로필 책자에서 「새로운 사람들」을 누른다', async () => {
    await 책자.열기();
    await 책자.필터누르기('새로운 사람들');
    await verify('프로필 책자에서 「새로운 사람들」을 누르면 주소에 order=new 가 붙는다', new URL(page.url()).searchParams.get('order'), 'new');
  });

  await test.step('프로필 책자에서 「알려진 연합우주로부터」를 누른다', async () => {
    await 책자.열기();
    await 책자.필터누르기('알려진 연합우주로부터');
    await verify('프로필 책자에서 「알려진 연합우주로부터」를 누르면 주소에 local=false 가 붙는다', new URL(page.url()).searchParams.get('local'), 'false');
  });
});
