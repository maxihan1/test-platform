import type { Page, Request } from '@playwright/test';

export async function 보낸요청끝날때까지(page: Page, 주소조각: string, 조작: () => Promise<void>): Promise<number> {
  const 보낸: Request[] = [];
  const 듣기 = (요청: Request) => {
    if (요청.url().includes(주소조각)) 보낸.push(요청);
  };
  page.on('request', 듣기);
  try {
    await 조작();
  } finally {
    page.off('request', 듣기);
  }
  await Promise.all(보낸.map((요청) => 요청.response()));
  return 보낸.length;
}

export async function 스크롤멈출때까지기다리기(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((끝) => {
        let 앞 = window.scrollY;
        let 같은 = 0;
        const 재기 = () => {
          if (window.scrollY === 앞) 같은 += 1;
          else {
            같은 = 0;
            앞 = window.scrollY;
          }
          if (같은 >= 5) 끝(true);
          else requestAnimationFrame(재기);
        };
        requestAnimationFrame(재기);
      }),
  );
}

export async function 두프레임뒤(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
}
