// 붙잡아 둔 증적 문서 한 부를 실제로 그려 파일로 남긴다 (SPEC §8.4)
// 라우트가 기다리지 않고 띄우므로 이 함수는 절대 던지지 않는다 — 던지면 잡을 사람이 없고 PENDING이 영원히 남는다

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { collectRun } from './collect.js';
import { renderHtml } from './html.js';
import { fail, findDocument, finish, type EvidenceFormat } from './store.js';

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

export async function generate(id: number, runId: number, format: EvidenceFormat): Promise<void> {
  try {
    // PDF·XLSX는 아직 없다. PENDING으로 두면 그 형식이 영영 잠기므로 사유를 적고 닫는다
    if (format !== 'HTML') {
      await fail(id, '아직 못 만드는 형식입니다');
      return;
    }

    // 「만든 시각」은 claim이 박아 둔 DB의 값이다. 여기서 새로 재면 문서와 기록이 갈린다 (SPEC §3.3)
    const 행 = await findDocument(id);
    if (행 === null) throw new Error(`증적 문서 ${String(id)} 행이 사라졌다`);

    const doc = await collectRun(runId);
    if (doc === null) throw new Error(`실행 ${String(runId)}을 찾지 못했다`);

    const 폴더 = join(artifactsDir(), 'evidence', String(runId));
    await mkdir(폴더, { recursive: true });
    const 파일경로 = join(폴더, `${String(id)}.${형식표[format].ext}`);
    await writeFile(파일경로, renderHtml(doc, { generatedAt: 행.generatedAt }), 'utf8');

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
