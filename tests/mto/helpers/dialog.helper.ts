import type { Page } from '@playwright/test';

export function 확인창받기(page: Page, 누를것: '확인' | '취소'): Promise<string> {
  return new Promise((풀기) => {
    page.once('dialog', (창) => {
      const 글 = 창.message();
      void (누를것 === '확인' ? 창.accept() : 창.dismiss()).then(() => 풀기(글));
    });
  });
}
