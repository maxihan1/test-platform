import type { Locator, Page } from '@playwright/test';

export function 경로(page: Page): string {
  return new URL(page.url()).pathname;
}

export async function 보이는글(칸: Locator): Promise<string> {
  return (await 칸.isVisible()) ? (await 칸.innerText()).trim() : '';
}

export async function 보이는이름들(대상: Record<string, Locator>): Promise<string> {
  const 보임: string[] = [];
  for (const [이름, 칸] of Object.entries(대상)) {
    if (await 칸.isVisible()) 보임.push(이름);
  }
  return 보임.join(', ');
}

export async function 켜진이름들(대상: Record<string, Locator>): Promise<string> {
  const 켜짐: string[] = [];
  for (const [이름, 칸] of Object.entries(대상)) {
    if (await 칸.isChecked()) 켜짐.push(이름);
  }
  return 켜짐.join(', ');
}

export async function 사라졌나(칸: Locator, 기다림밀리초 = 3000): Promise<boolean> {
  try {
    await 칸.waitFor({ state: 'hidden', timeout: 기다림밀리초 });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') return false;
    throw err;
  }
}
