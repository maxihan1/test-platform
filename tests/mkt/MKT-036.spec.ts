import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-036',
  name: '로그인 안내 모달이 0.3초 동안 서서히 나타나고 서서히 사라진다',
  precondition: ['비회원으로 게시글 상세를 열었다', '로그인 안내 모달이 떠 있다'],
  params: z.object({
    postPath: z.string().min(1).describe('열어 볼 게시글 상세 주소').default('/board/44'),
  }),
  expected: z.object({
    fadeSeconds: z.number().describe('모달이 나타나고 사라지는 시간(초)').default(0.3),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 모달 = page.getByRole('dialog');
  const 전환재기 = async () =>
    page.evaluateHandle(() => ({
      초: new Promise<number>((resolve) => {
        const 들음 = (e: TransitionEvent) => {
          const 바탕 = e.target;
          if (e.propertyName !== 'opacity' || !(바탕 instanceof Element) || !바탕.querySelector('[role=dialog]')) return;
          const 전환 = 바탕.getAnimations().find((a) => a instanceof CSSTransition && a.transitionProperty === 'opacity');
          document.removeEventListener('transitionrun', 들음);
          resolve(Number(전환?.effect?.getTiming().duration ?? 0) / 1000);
        };
        document.addEventListener('transitionrun', 들음);
      }),
    }));

  await test.step('비회원으로 게시글 상세를 열고 「좋아요」를 누른다', async () => {
    await page.goto(params.postPath);
    const 좋아요버튼 = page.getByRole('button', { name: /좋아요/ });
    await 좋아요버튼.waitFor();
    const 나타남 = await 전환재기();
    await 좋아요버튼.click();
    await 모달.waitFor();
    await verify('모달이 0.3초 동안 서서히 나타난다', await 나타남.evaluate((m) => m.초), expected.fadeSeconds);
  });

  await test.step('「취소」를 누른다', async () => {
    const 사라짐 = await 전환재기();
    await 모달.getByRole('button', { name: '취소' }).click();
    await verify('모달이 0.3초 동안 서서히 사라진다', await 사라짐.evaluate((m) => m.초), expected.fadeSeconds);
  });
});
