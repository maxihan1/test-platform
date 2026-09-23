// 작성 에이전트의 껍데기 — 한 건 처리(사본 → 자식 → 올리기) · 켤 때 멈춘 줄 닫기.
// 여기는 I/O 뿐이다. 판단은 authoring-chain · authoring-copy · authoring-assets · authoring-model 의 순수 함수에 있고 검사도 거기 붙어 있다.
//
// **자식은 자기 사본 트리에만 쓴다** (2026-09-24 게이트 0). 서버 저장소(`원천`)에는 아무것도 안 쓴다 —
// main SHA 는 묻기만 하고, 받는 일은 사본이 한다. 컨테이너(root)에서는 자식이 자리 uid 로 돌아 에이전트의 토큰을 못 읽는다.

import { writeFileSync } from 'node:fs';

import { type 집은것, 거절인가, 줄프롬프트, 클로드인자 } from './authoring-rules.js';
import { type 모델, 한도걸렸나 } from './authoring-model.js';
import { type 자료, 돌릴수있나, 못읽는자료, 자료계획, 자료출처 } from './authoring-assets.js';
import { 닫을RUNNING, 자식환경, 케이스폴더 } from './authoring-chain.js';
import { type 계정, type 사본, 사본환경 } from './authoring-copy.js';
import { 사본만들기, 사본치우기, 자식거두기 } from './authoring-child.js';
import {
  type 보고손,
  type 칠때,
  type 판정기,
  거절글,
  닫으며,
  돌린다,
  보고손만들기,
  인증헤더,
  부른다,
  진짜main묻기,
  친다,
  한번더건다,
} from './authoring-io.js';
import { 머지처리 } from './authoring-merge.js';
import { 올리기 } from './authoring-upload.js';

/** 켤 때 정해 두고 모든 건이 같이 쓰는 것 */
export interface 판 {
  판정: 판정기;
  모델: 모델;
  /** 사본을 만드는 자리 (`AUTHORING_WORK_DIR`, 비면 OS 임시 폴더) */
  바탕: string;
  /** 서버 저장소. 사본의 원천이고 병합 뒤 당기는 자리다 */
  원천: string;
  원격주소: string;
  /** root 가 아니면(맥) null — 한 계정으로 돈다 */
  계정: { 자식: 계정[]; 호스트: 계정 } | null;
  /** 원천에 쓰는 git 을 누구로 치나. root 면 호스트 uid 와 그 집 */
  호스트로: 칠때;
}

/** 켤 때 내 이름으로 잡힌 채 멈춘 RUNNING 을 닫는다. 에이전트가 꺼져 끊긴 것이라 아무도 안 끝낸다 */
export async function 멈춘것닫기(주소기지: string, 토큰: string, 서비스들: string[], 나: string): Promise<void> {
  for (const 서비스 of 서비스들) {
    const 답 = await 부른다(주소기지, 토큰, `/authoring/requests?service=${encodeURIComponent(서비스)}&status=RUNNING`);
    if (답.status !== 200) {
      console.error(`[기다림] ${서비스} 의 RUNNING 목록을 못 읽었다 (${답.status}). 이번엔 건너뛴다.`);
      continue;
    }
    const 목록 = (답.몸 as { items?: { id: number; status: string; claimedBy?: string | null }[] }).items ?? [];
    for (const id of 닫을RUNNING(목록, 나)) {
      await 보고손만들기(주소기지, 토큰, 서비스, id).끝내기({
        status: 'FAILED',
        error: '작성 에이전트가 꺼져 중단됐다 — 다시 넣어라',
      });
      console.log(`[정리] ${서비스} 의 ${id}번은 에이전트가 꺼져 멈춘 채였다. 실패로 닫았다.`);
    }
  }
}

/** 한 건을 끝까지 처리한다. 단계는 사람이 화면에서 보는 그 줄이다. `자리번호` 가 자식 uid 를 고른다 */
export async function 한건처리(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자리번호: number,
  서버들: { env: string; baseUrl: string }[] = [],
): Promise<void> {
  const 손 = 보고손만들기(주소기지, 토큰, 서비스, 것.id);
  await 닫으며(손, (감싼손) => 한건(주소기지, 토큰, 서비스, 것, 판, 자리번호, 서버들, 감싼손));
}

async function 한건(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자리번호: number,
  서버들: { env: string; baseUrl: string }[],
  손: 보고손,
): Promise<void> {
  if (것.kind === 'MERGE') {
    // **머지 행에는 PR 주소가 안 실려 온다** — 서버가 줄을 세울 때 그 칸을 안 채운다
    // (`authoring/store.ts` 의 `줄세우기`). 그래서 **원본 행을 읽어** 가져온다
    let 주소 = 것.prUrl ?? null;
    if (주소 === null && typeof 것.sourceId === 'number') {
      const 원본 = await 부른다(주소기지, 토큰, `/authoring/requests/${것.sourceId}?service=${encodeURIComponent(서비스)}`);
      주소 = (원본.몸 as { prUrl?: string | null } | null)?.prUrl ?? null;
    }
    if (주소 === null) {
      await 손.끝내기({ status: 'FAILED', error: '머지할 초안 PR 주소가 없다' });
      return;
    }
    // 확인하는 브랜치는 **prUrl 을 읽어 온 그 행**의 것이다 — 재실행이 올린 PR 이면 author-<재실행 번호>
    await 머지처리(손, 주소, 판.판정, 것.prUrl ? 것.id : 것.sourceId ?? undefined, 판.원천, 판.호스트로);
    return;
  }

  // 재실행 행은 자기 자료가 없다. 원본 행을 읽어 자료와(옛 행이면) 본문을 가져온다
  const 출처 = 자료출처(것);
  let 자료들 = 것.assets ?? [];
  let 본문 = 것.specText ?? null;
  if (출처 !== 것.id) {
    const 원본 = await 부른다(주소기지, 토큰, `/authoring/requests/${출처}?service=${encodeURIComponent(서비스)}`);
    if (원본.status !== 200) {
      await 손.끝내기({ status: 'FAILED', error: `원본 요청(${출처}번)을 못 읽었다 (${원본.status})` });
      return;
    }
    const 몸 = 원본.몸 as { assets?: 자료[]; specText?: string | null };
    자료들 = 몸.assets ?? [];
    본문 = 본문 || (몸.specText ?? null);
  }

  const 막힘 = 돌릴수있나({ specText: 본문, figmaToken: 것.figmaToken }, 자료들);
  if (막힘 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 막힘 });
    return;
  }

  await 손.단계('작업방을 만드는 중');
  // 기준은 GitHub 이 말하는 main 이다. 서버 저장소의 origin/main 은 옛 판일 수 있다
  const 메인 = 진짜main묻기(판.원천);
  if ('까닭' in 메인) {
    await 손.끝내기({ status: 'FAILED', error: 메인.까닭 });
    return;
  }
  const 자식 = 판.계정?.자식[자리번호] ?? null;
  const 만든것 = await 사본만들기(것.id, 판.바탕, 판.원천, 판.원격주소, 메인.sha, 자식);
  if ('까닭' in 만든것) {
    await 손.끝내기({ status: 'FAILED', error: 만든것.까닭 });
    return;
  }
  const 자리 = 만든것.자리;
  try {
    await 사본에서(주소기지, 토큰, 서비스, 것, 판, 자식, 자리, 메인.sha, 출처, 자료들, 본문, 서버들, 손);
  } finally {
    // 받은 기획서와 자식이 만든 것을 남기지 않는다. 성공이든 실패든 지운다
    자식거두기(자식);
    사본치우기(자리);
  }
}

async function 사본에서(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자식: 계정 | null,
  자리: 사본,
  기준: string,
  출처: number,
  자료들: 자료[],
  본문: string | null,
  서버들: { env: string; baseUrl: string }[],
  손: 보고손,
): Promise<void> {
  const 깃 = 사본환경(자리);
  const 트리에서 = (명령: string, 인자: string[], 제한 = 120_000) =>
    친다(명령, 인자, 자리.트리, undefined, 제한, { env: 깃 });

  // 테스트 폴더는 사본의 기존 케이스로 찾는다 (2026-09-23 사용자 결정). 없으면 첫 케이스는 사람의 일이다
  const 목록 = 트리에서('git', ['-c', 'core.quotePath=false', 'ls-files', 'tests']);
  const 케이스자리 = 목록.ok ? 케이스폴더(목록.낸것.split('\n'), 서비스) : null;
  if (케이스자리 === null) {
    await 손.끝내기({ status: 'FAILED', error: `${서비스} 의 케이스 폴더를 못 찾았다 — 첫 케이스는 사람이 /tpx 로 만든다` });
    return;
  }

  const 계획 = 자료계획(자료들, 자리.자료);
  const 못읽음 = 못읽는자료(계획);
  if (못읽음 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 못읽음 });
    return;
  }
  if (계획.some((c) => c.kind === 'FILE')) await 손.단계('자료를 받는 중');
  for (const c of 계획) {
    if (c.kind !== 'FILE') continue;
    // 바이트로 받아야 해서 `부른다`(json) 를 못 쓴다. 다시 걸기와 시간 제한은 같게 건다 —
    // 상한 크기 파일도 로컬 망에서 이 안에 온다. 안 오면 서버가 멈춘 것이다
    const 답 = await 한번더건다(() =>
      fetch(`${주소기지}/api/authoring/requests/${출처}/assets/${c.id}?service=${encodeURIComponent(서비스)}`, {
        headers: 인증헤더(토큰),
        signal: AbortSignal.timeout(120_000),
      }),
    );
    if (거절인가(답.status)) {
      throw new Error(`(${답.status}) ${거절글}`);
    }
    if (!답.ok) {
      await 손.끝내기({ status: 'FAILED', error: `자료 「${c.name}」 을 못 받았다 (${답.status})` });
      return;
    }
    // 바이트 그대로 쓴다. 글자로 읽으면 PDF·워드가 깨진다. 자식이 읽도록 0644 — 폴더가 자식 것이라 남은 못 본다
    writeFileSync(c.받을자리, Buffer.from(await 답.arrayBuffer()), { mode: 0o644 });
    if (c.변환 === null) continue;
    const 바꾼것 = 친다(c.변환.명령, c.변환.인자, 자리.자료);
    if (!바꾼것.ok) {
      await 손.끝내기({ status: 'FAILED', error: `자료 「${c.name}」 을 글자로 못 바꿨다: ${바꾼것.까닭}` });
      return;
    }
  }

  await 손.단계('케이스를 만드는 중');
  // 환경은 **통째로** 준다. 피그마 토큰은 자식에게만, GitHub 자격증명과 에이전트 토큰은 빼고, 집은 작업마다 새것
  const 돌린것 = await 돌린다('claude', 클로드인자(자리.자료, 판.모델), {
    cwd: 자리.트리,
    input: 줄프롬프트({ ...것, specText: 본문 }, 서비스, 계획, { 폴더: 케이스자리, 서버들 }),
    env: { ...자식환경(process.env, 자리.gh, 것.figmaToken), HOME: 자리.집 },
    uid: 자식?.uid,
    gid: 자식?.gid,
    제한: 60 * 60_000,
    흘림: true,
  });
  // 검사 전에 자식이 남긴 것을 전부 죽인다 — 살아 있으면 검사한 뒤에 파일을 바꿔치기한다
  자식거두기(자식);
  if (돌린것.코드 === null && !돌린것.시간초과) {
    await 손.끝내기({ status: 'FAILED', error: `claude 를 못 띄웠다: ${돌린것.오류.trim().split('\n').pop() ?? ''}` });
    return;
  }
  if (돌린것.코드 !== 0) {
    const 한도 = 한도걸렸나(`${돌린것.낸것}\n${돌린것.오류}`);
    await 손.끝내기({
      status: 'FAILED',
      error: 한도
        ? 'Claude 구독 한도에 걸렸다 — 한도가 풀린 뒤 다시 넣어라'
        : 돌린것.시간초과
          ? '케이스를 만들다 60분을 넘겨 멈췄다'
          : '케이스를 만들다 멈췄다. 에이전트 기록을 봐라.',
    });
    return;
  }

  await 올리기(자리, 것, 서비스, 판.판정, 기준, 돌린것.낸것, 손);
}
