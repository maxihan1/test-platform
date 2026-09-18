// 붙잡아 둔 증적 문서 한 부를 실제로 그려 파일로 남긴다 (SPEC §8.4)
// 라우트가 기다리지 않고 띄우므로 이 함수는 절대 던지지 않는다 — 던지면 잡을 사람이 없고 PENDING이 영원히 남는다

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { chromium } from '@playwright/test';

import { enqueue } from '../execution/dispatcher.js';
import { collectRun, type EvidenceDocument } from './collect.js';
import { renderHtml } from './html.js';
import { fail, findDocument, finish, type EvidenceFormat } from './store.js';
import { renderXlsx } from './xlsx.js';

/** 확장자와 Content-Type을 한 표에 둔다. 두 곳으로 갈리면 html 파일이 application/pdf로 나간다 */
export const 형식표: Record<EvidenceFormat, { ext: string; mime: string }> = {
  HTML: { ext: 'html', mime: 'text/html; charset=utf-8' },
  PDF: { ext: 'pdf', mime: 'application/pdf' },
  XLSX: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

// 러너와 어드민이 같은 볼륨을 본다. 증적 경로는 artifacts/evidence/{runId}/{id}.{확장자} (SPEC §6)
// execution 의 같은 함수를 가져다 쓰지 않는다 — 갈래 사이에 의존을 만들면 한쪽을 고칠 때 남이 깨진다
function artifactsDir(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

/** 러너가 run_item_step.screenshot_path 에 남기는 값의 접두사 (packages/kit runtime/artifacts.ts shotPath) */
const 저장접두 = 'artifacts/';

// 그림을 문서 안에 심는다. 경로로 두면 HTML 은 /api/evidence/ 아래로 상대경로가 풀려 404 이고,
// PDF 는 setContent 라 기준 주소가 about:blank 이어서 요청조차 나가지 않는다.
// 증적 문서는 파일만 떼어 검수처에 보내는 물건이라 그림이 딸려 가야 한다 (SPEC §8.4)
async function 심는다(경로: string): Promise<string | null> {
  // DB 값이지만 파일시스템을 읽는 자리다. 러너가 만든 모양이 아니면 아예 열지 않는다
  if (!경로.startsWith(`${저장접두}runs/`) || 경로.includes('..')) {
    console.warn(`[reporting] 스크린샷 경로가 저장 규약을 벗어나 문서에서 뺀다: ${경로}`);
    return null;
  }

  try {
    // 저장값의 artifacts/ 접두사는 artifactsDir() 과 겹친다. 떼지 않으면 artifacts/artifacts/ 가 된다
    const png = await readFile(join(artifactsDir(), 경로.slice(저장접두.length)));
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (err) {
    // 그림 한 장이 사라졌다고 증적 전체를 실패로 만들지 않는다. 왜 비었는지만 남긴다
    console.warn(`[reporting] 스크린샷을 읽지 못해 문서에서 뺀다: ${경로}`, err);
    return null;
  }
}

// 원본 모델은 그대로 둔다 — 엑셀은 같은 모델의 경로 글자를 그대로 써야 한다 (SPEC §8.4 「스크린샷은 경로만」).
// 같은 파일이면 base64 도 같으므로 재현 불변식은 그대로다 (SPEC §3.3)
async function 스크린샷을심는다(doc: EvidenceDocument): Promise<EvidenceDocument> {
  const items = await Promise.all(
    doc.items.map(async (item) => ({
      ...item,
      steps: await Promise.all(
        item.steps.map(async (s) => ({
          ...s,
          screenshotPath: s.screenshotPath === null ? null : await 심는다(s.screenshotPath),
        })),
      ),
    })),
  );

  return { ...doc, items };
}

// HTML 을 그대로 찍는다 — 별도 PDF 레이아웃을 두면 화면과 문서가 갈린다 (SPEC §8.4).
// 브라우저 기동은 실행과 같은 대기줄에 태운다. 서로 다른 실행의 PDF 를 동시에 누르면
// 부분 유일 인덱스가 못 막아 Chromium 이 여러 개 뜬다 — 대상 서버는 2코어다 (SPEC §9)
function 찍는다(html: string, 파일경로: string): Promise<void> {
  return enqueue(async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      // 바깥 자원을 받아 오지 않는 인라인 문서다. load 면 그릴 것이 다 그려졌다
      await page.setContent(html, { waitUntil: 'load' });
      await writeFile(파일경로, await page.pdf({ format: 'A4', printBackground: true }));
    } finally {
      // 여기서 안 닫으면 실패할 때마다 Chromium 프로세스가 남는다
      await browser.close();
    }
  });
}

export async function generate(id: number, runId: number, format: EvidenceFormat): Promise<void> {
  try {
    // 「만든 시각」은 claim이 박아 둔 DB의 값이다. 여기서 새로 재면 문서와 기록이 갈린다 (SPEC §3.3)
    const 행 = await findDocument(id);
    if (행 === null) throw new Error(`증적 문서 ${String(id)} 행이 사라졌다`);

    const doc = await collectRun(runId);
    if (doc === null) throw new Error(`실행 ${String(runId)}을 찾지 못했다`);

    const 폴더 = join(artifactsDir(), 'evidence', String(runId));
    await mkdir(폴더, { recursive: true });
    const 파일경로 = join(폴더, `${String(id)}.${형식표[format].ext}`);
    // 엑셀만 HTML 을 거치지 않는다. 같은 모델을 표로 따로 편다 (SPEC §8.4)
    if (format === 'XLSX') await writeFile(파일경로, await renderXlsx(doc, { generatedAt: 행.generatedAt }));
    else {
      const html = renderHtml(await 스크린샷을심는다(doc), { generatedAt: 행.generatedAt });
      if (format === 'HTML') await writeFile(파일경로, html, 'utf8');
      else await 찍는다(html, 파일경로);
    }

    await finish(id, 파일경로);
  } catch (err) {
    // 원문은 서버 로그에만 남긴다. 화면에 가는 것은 사람이 읽을 한 문장이다 (SPEC §8.4)
    console.error(`[reporting] 증적 문서 ${String(id)} 생성이 깨졌다`, err);
    await fail(id, '증적 문서를 만들지 못했습니다').catch((닫기오류: unknown) => {
      // 여기까지 깨지면 PENDING이 풀리지 않아 「다시 만들기」가 영원히 409를 받는다. 사람이 보게 남긴다
      console.error(`[reporting] 증적 문서 ${String(id)}를 FAILED로 닫지도 못했다`, 닫기오류);
    });
  }
}
