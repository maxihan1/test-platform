// 작성 에이전트의 껍데기 — 한 건 처리(사본 → 자식 → 올리기) · 켤 때 멈춘 줄 닫기.
// 여기는 I/O 뿐이다. 판단은 authoring-chain · authoring-copy · authoring-assets · authoring-model 의 순수 함수에 있고 검사도 거기 붙어 있다.
//
// **자식은 자기 사본 트리에만 쓴다** (2026-09-24 게이트 0). 서버 저장소(`원천`)에는 아무것도 안 쓴다 —
// main SHA 는 묻기만 하고, 받는 일은 사본이 한다. 컨테이너(root)에서는 자식이 자리 uid 로 돌아 에이전트의 토큰을 못 읽는다.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type 집은것, 거절인가, 줄프롬프트, 클로드인자 } from './authoring-rules.js';
import { type 모델, 한도걸렸나 } from './authoring-model.js';
import { 결제환경, 크레딧먼저, 크레딧바닥났나, 크레딧키이름 } from './authoring-billing.js';
import { type 자료, 돌릴수있나, 못읽는자료, 입력만, 자료계획, 자료출처, 화면만인가 } from './authoring-assets.js';
import { 대상점검, 대상환경, 사유거르기 } from './authoring-reverse.js';
import { 자식환경 } from './authoring-chain.js';
import { type 계정, 사본환경 } from './authoring-copy.js';
import { 사본치우기, 자식거두기, 자식빈환경 } from './authoring-child.js';
import { type 작업방, 도는번호, 보관하기, 작업방준비 } from './authoring-keeping.js';
import { type 보고손, type 칠때, type 판정기, 거절글, 닫으며, 돌린다, 멈춤, 보고손만들기, 부른다, 친다 } from './authoring-io.js';
import { 머지처리 } from './authoring-merge.js';
import { 고치기실행인가, 편집처리 } from './authoring-edit.js';
import { 자료받기 } from './authoring-marking.js';
import { 올리기 } from './authoring-upload.js';
import { 사용량보고, 흐름풀기 } from './authoring-usage.js';
import { 거절로, 끝낼상태, 자식제한, 진척누적기, 진척재기 } from './authoring-progress.js';
import { type 박동, 박동손 } from './authoring-heartbeat.js';
import { type 서비스설정 } from './authoring-token.js';
import { 먼저가리기 } from './authoring-masking.js';
import { 원장과남은번호 } from './authoring-ledger-io.js';
import { 화면지도준비 } from './authoring-covered.js';
import { 앞결과, 옮기기올리기, 판받기 } from './authoring-prd-io.js';
import { 반영요청인가, 안옮김뒤, 화면이맞음읽기 } from './authoring-screen-right.js';

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

/** 한 건을 끝까지 처리한다. 단계는 사람이 화면에서 보는 그 줄이다. `자리번호` 가 자식 uid 를 고른다 */
export async function 한건처리(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자리번호: number,
  설정: 서비스설정,
): Promise<void> {
  const 박동 = 박동손(보고손만들기(주소기지, 토큰, 서비스, 것.id));
  // 거절로 끝내기 없이 나가도 신호를 멈춘다 — 그 밖의 길은 끝내기가 멈춘다
  await 닫으며(박동.손, (감싼손) => 한건(주소기지, 토큰, 서비스, 것, 판, 자리번호, 설정, 감싼손, 박동)).finally(박동.멈추기);
}

async function 한건(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자리번호: number,
  설정: 서비스설정,
  손: 보고손,
  박동: 박동,
): Promise<void> {
  if (것.kind === 'MERGE') {
    // **머지 행에는 PR 주소가 안 실려 온다**(`store.ts` `줄세우기`) — 원본 행을 읽어 주소와 뿌리를 가져온다
    let 주소 = 것.prUrl ?? null;
    let 요청뿌리: number | undefined;
    let 고치기 = false;
    if (typeof 것.sourceId === 'number') {
      const 원본 = (await 부른다(주소기지, 토큰, `/authoring/requests/${것.sourceId}?service=${encodeURIComponent(서비스)}`)).몸;
      주소 ??= (원본 as { prUrl?: string | null } | null)?.prUrl ?? null;
      요청뿌리 = (원본 as { rootId?: number } | null)?.rootId;
      // 고치기 반영은 겹침을 안 본다 — params.edits 는 고치기 실행만 가진다 (§3.6 「★ 반영 때 겹침 검사」)
      고치기 = Array.isArray((원본 as { params?: { edits?: unknown } } | null)?.params?.edits);
    }
    if (주소 === null) {
      await 손.끝내기({ status: 'FAILED', error: '머지할 초안 PR 주소가 없다' });
      return;
    }
    // 브랜치는 author-<뿌리> — 그 전에 선 PR 은 prUrl 을 가진 원본 행(sourceId)의 author-<실행 번호> 다 (§7 「실행 기록」)
    const 자식 = 판.계정?.자식[자리번호] ?? null;
    const 반영폴더 = '사유' in 설정.폴더 ? null : 설정.폴더.폴더;
    await 머지처리(손, 주소, 판.판정, 것.sourceId ?? undefined, 판.원천, 판.호스트로, 요청뿌리, { 것, 서비스, 판, 자식, 폴더: 반영폴더, 고치기 });
    return;
  }

  // 테스트 폴더는 서비스 설정의 testsDir 다 (2026-09-25 계약 변경 승인). 아직 없는 폴더여도 된다 — 자식이 만든다.
  // 사본을 만들기 전에 거른다 — 설정이 틀린 건에 작업방을 만들 까닭이 없다
  if ('사유' in 설정.폴더) {
    await 손.끝내기({ status: 'FAILED', error: 설정.폴더.사유 });
    return;
  }
  // 케이스 고치기는 자식 없이 main 사본에서 고친다 (§3.6 「★ 케이스 고치기」)
  if (고치기실행인가(것)) return 편집처리(손, 것, 서비스, 판, 판.계정?.자식[자리번호] ?? null, 설정.폴더.폴더);
  // 역방향 — 집을 때 다시 대조한다. 만든 뒤 설정이 바뀌었을 수 있다 (도메인/작성 §7 집기 ★)
  const 대상사유 = 대상점검(것.target);
  if (대상사유 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 대상사유 });
    return;
  }

  // 재실행 행은 자기 자료가 없다. 원본 행을 읽어 자료와(옛 행이면) 본문을 가져온다
  const 출처 = 자료출처(것);
  // 사람이 넣은 입력만 읽는다 — 원본에 에이전트 산출물(표시 사본·역기획서)이 붙어 있을 수 있다
  let 자료들 = 입력만(것.assets ?? []);
  let 본문 = 것.specText ?? null;
  // 이어 작성의 원본 — 재실행 · 이어서 작성 행에는 칸이 없어 뿌리 상세에서 읽는다 (§3.6 「남은 요구로 이어 작성」)
  let 이어작성원본 = 것.continueFrom ?? null;
  if (출처 !== 것.id) {
    const 원본 = await 부른다(주소기지, 토큰, `/authoring/requests/${출처}?service=${encodeURIComponent(서비스)}`);
    if (원본.status !== 200) {
      await 손.끝내기({ status: 'FAILED', error: `원본 요청(${출처}번)을 못 읽었다 (${원본.status})` });
      return;
    }
    const 몸 = 원본.몸 as { assets?: 자료[]; specText?: string | null; continueFrom?: number | null };
    자료들 = 입력만(몸.assets ?? []);
    본문 = 본문 || (몸.specText ?? null);
    이어작성원본 ??= 몸.continueFrom ?? null;
  }

  const 막힘 = 반영요청인가(것) ? null : 돌릴수있나({ specText: 본문, figmaToken: 것.figmaToken, 화면만: 화면만인가(것, 자료들) }, 자료들);
  if (막힘 !== null) return void (await 손.끝내기({ status: 'FAILED', error: 막힘 }));

  await 손.단계('작업방을 만드는 중');
  const 자식 = 판.계정?.자식[자리번호] ?? null;
  도는번호.add(것.id);
  // 어떻게 끝냈는지 본다 — 중단이면 폴더를 남겨 이어서 작성하게 한다 (작성 §7 「이어하기」)
  let 끝낸상태: unknown = null;
  const 기록손: 보고손 = { ...손, 끝내기: (몸) => ((끝낸상태 = 몸.status), 손.끝내기(몸)) };
  let 방: 작업방 | null = null;
  try {
    방 = await 작업방준비(주소기지, 토큰, 서비스, 것, 판, 자식, 설정.폴더.폴더, 기록손);
    if (방 !== null) await 사본에서(주소기지, 토큰, 서비스, 것, 판, 자식, 방, 출처, 자료들, 본문, 설정, 설정.폴더.폴더, 기록손, 박동, 이어작성원본);
  } finally {
    // 성공·실패는 받은 기획서와 자식이 만든 것을 남기지 않는다. 중단은 7일 남긴다 —
    // 단 자식을 못 거뒀으면 손대지 않는다. 살아 있는 자식이 지우는 도중에 폴더를 링크로 바꿔 트리 밖을 지우게 할 수 있다.
    // 에이전트가 거절로 빠지면 끝내기 없이 나간다 — 다시 켜질 때 AGENT_RESTART 중단으로 닫히므로 그때를 위해 남긴다
    const 남긴다 = 끝낸상태 === 'STOPPED' || (끝낸상태 === null && 멈춤.까닭 !== null);
    if (방 !== null && (await 자식거두기(자식))) (남긴다 ? 보관하기 : 사본치우기)(방.자리, 자식);
    도는번호.delete(것.id);
  }
}

async function 사본에서(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자식: 계정 | null,
  방: 작업방,
  출처: number,
  자료들: 자료[],
  본문: string | null,
  설정: 서비스설정,
  케이스자리: string,
  손: 보고손,
  박동: 박동,
  이어작성원본: number | null,
): Promise<void> {
  const { 자리, 기준 } = 방;
  const 계획 = 자료계획(자료들, 자리.자료);
  const 못읽음 = 못읽는자료(계획);
  if (못읽음 !== null) {
    await 손.끝내기({ status: 'FAILED', error: 못읽음 });
    return;
  }
  if (계획.some((c) => c.kind === 'FILE')) await 손.단계('자료를 받는 중');
  for (const c of 계획) {
    if (c.kind !== 'FILE') continue;
    // 바이트로 받아야 해서 `부른다`(json) 를 못 쓴다 — 표시가 원본을 다시 받을 때와 같은 손을 쓴다
    const 답 = await 자료받기({ 주소기지, 토큰 }, 서비스, 출처, c.id);
    if ('코드' in 답 && 거절인가(답.코드)) {
      throw new Error(`(${답.코드}) ${거절글}`);
    }
    if ('코드' in 답) {
      await 손.끝내기({ status: 'FAILED', error: `자료 「${c.name}」 을 못 받았다 (${답.코드})` });
      return;
    }
    // 바이트 그대로 쓴다. 글자로 읽으면 PDF·워드가 깨진다. 자식이 읽도록 0644 — 폴더가 자식 것이라 남은 못 본다
    writeFileSync(c.받을자리, 답.몸, { mode: 0o644 });
    if (c.변환 === null) continue;
    // 믿을 수 없는 파일을 여는 것이라 root 가 아니라 자리 uid 로, 토큰 없는 환경으로 연다
    const 바꾼것 = 친다(
      c.변환.명령,
      c.변환.인자,
      자리.자료,
      undefined,
      120_000,
      자식 === null ? {} : { ...자식, env: 자식빈환경({ HOME: 자리.집, TMPDIR: 자리.임시 }) },
    );
    if (!바꾼것.ok) {
      await 손.끝내기({ status: 'FAILED', error: `자료 「${c.name}」 을 글자로 못 바꿨다: ${바꾼것.까닭}` });
      return;
    }
  }
  // 역방향 — 자식을 띄우기 전에 기획서·앞 실행이 남긴 파일·본문에서 비밀번호를 먼저 가린다 (§3.6 「★ 역방향」)
  const 가림 = 먼저가리기(것.id, 계획, 자리, 본문, 것.target?.loginPassword);
  if ('사유' in 가림) return void (await 손.끝내기({ status: 'FAILED', error: 가림.사유 }));
  // 작성은 표준 기획서만 읽는다 — 지금 판으로 원장을 만든다. 못 받으면 원장이 없어 작성하지 않는다 (§3.6 「작성은 표준 기획서만 읽는다」)
  const 기획서 = await 판받기({ 주소기지, 토큰 }, 서비스, 것.id, 자리.자료, 것.target?.loginPassword);
  if ('까닭' in 기획서) return void (await 손.끝내기({ status: 'FAILED', error: 기획서.까닭 }));
  // 이어 작성 · 반영은 옮기지 않는다 — 뿌리가 같은 자료를 이미 옮겼거나 옮길 자료가 없다. 화면만도 옮긴다(항목이 전부 확인 필요)
  const 옮긴다 = 이어작성원본 === null && !반영요청인가(것);
  // 가린 뒤 뽑는다 — 사본에 계정 원문이 안 남게. 판정은 메모리의 것으로. 기준 표는 트리가 아니라 기준 SHA 에서. 이어받은 폴더면 앞 결과 파일의 임시 번호를 잇는다
  const 깃 = (인자: string[]) => 친다('git', 인자, 자리.트리, undefined, 120_000, { env: 사본환경(자리) });
  const 원장 = 원장과남은번호({ 계획, 자료폴더: 자리.자료, 깃, 기준, 서비스, 폴더: 케이스자리, 이어작성원본, 지금: 기획서.앞판.items, 옮긴다, 옮긴몸: 옮긴다 ? 앞결과(자리, 기획서.앞판.items, 서비스) : undefined, 반영: 반영요청인가(것) ? { 지금판: 기획서.앞판.version, 기준판: 기획서.기준판, 화면이맞음: 화면이맞음읽기(것) } : undefined });
  if ('막힘' in 원장) return void (await 손.끝내기({ status: 'FAILED', error: 원장.막힘 }));
  // 역방향은 기준 SHA 의 파일로 화면 ↔ 케이스 지도(바뀐 화면 케이스 — PRD-F6-04)를, 화면만은 PRD 에 이미 있는 화면도 센다. 화면만이 못 세면 기획서 화면을 또 쓰므로 실패, 대조는 바뀐 화면 케이스를 못 볼 뿐이다 (§3.6)
  const 못셈 = 것.target === undefined ? null : 화면지도준비({ 깃, 기준, 서비스, 폴더: 케이스자리, 번호들: 기획서.앞판.번호들, 자료폴더: 자리.자료, 화면만: 화면만인가(것, 자료들) });
  if (못셈 !== null && 화면만인가(것, 자료들)) return void (await 손.끝내기({ status: 'FAILED', error: `PRD 에 이미 있는 화면을 못 셌다 — ${못셈.까닭}` }));
  if (못셈 !== null) console.error(`[작성] ${것.id}번 — 화면 ↔ 케이스 지도를 못 세 바뀐 화면 케이스를 안 본다: ${못셈.까닭}`);
  await 손.단계('케이스를 만드는 중');
  if (박동.멈추라했다()) return void (await 손.끝내기({ status: 'STOPPED', stopReason: 'USER' }));
  // 환경은 **통째로** 준다. 피그마 토큰은 자식에게만, GitHub 자격증명과 에이전트 토큰은 뺀다.
  // 임시 자리는 작업마다 따로 — 공용 /tmp 면 같은 자리 uid 를 받은 다음 건이 앞 건이 심은 캐시를 돌린다.
  // 집을 바꾸는 것은 자리 uid 로 돌 때만 — 맥에서 바꾸면 Playwright 가 ~/Library/Caches 의 브라우저를 못 찾는다 (2026-09-24 코드 검토)
  const 환경 = {
    ...자식환경(process.env, 자리.gh, 것.figmaToken),
    // 맥은 둘 다 그대로 — 긴 임시 경로는 유닉스 소켓 104자 한도에 닿을 수 있다
    // 끝의 전체 3회 결과 파일 자리는 에이전트가 정한다 — 맥은 TMPDIR 이 시스템 것이라 거기 쓰면 못 찾는다. 임시는 실행마다 새것이다
    ...(자식 === null ? {} : { HOME: 자리.집, TMPDIR: 자리.임시 }), AUTHORING_GATE3_DIR: 자리.임시,
    // 역방향 — 대상 서버·테스트 계정은 환경 변수로만. 프롬프트·인자에는 값을 안 싣는다 (§7 ★)
    ...(것.target === undefined ? {} : 대상환경(것.target)),
  };
  const 역방향 = 것.target === undefined ? undefined : { 화면만: 화면만인가(것, 자료들), 산출물폴더: join(자리.자료, 'out'), 제외: 설정.제외 };
  const 인자 = 클로드인자(자리.자료, 판.모델);
  // 진척 — 케이스는 자식 시작 뒤 새로 생긴 것만, 화면은 역방향만 센다. limitSec 0 — 전체 상한이 없어 화면이 시간 막대를 안 그린다 (작성 §7)
  const 누적 = 진척누적기(0, { loginPassword: 것.target?.loginPassword, figmaToken: 것.figmaToken });
  const 재기 = 진척재기(누적, 자리.트리, 케이스자리, 역방향 === undefined ? undefined : join(자리.자료, 'screens'), 방.옛케이스);
  // API 크레딧 키가 있으면 크레딧으로 먼저 — 시작하자마자 없으면 구독으로 한 번 더 (authoring-billing)
  const { 돌린것, 크레딧으로 } = await 크레딧먼저(process.env[크레딧키이름] || undefined, (키) => 박동.자식동안(재기, (신호) =>
    돌린다(자식 === null ? 'claude' : 'sh', 자식 === null ? 인자 : ['-c', 'umask 077 && exec claude "$@"', 'sh', ...인자], {
      cwd: 자리.트리,
      input: 줄프롬프트({ ...것, specText: 가림.본문 }, 서비스, 계획, { 폴더: 케이스자리, 서버들: 설정.서버들 }, 역방향, 방.이어하기, 원장.입력, 원장.이어작성, join(자리.자료, 'resume-memo.md'), 옮긴다 ? { ...기획서.입력, 원본: 원장.원본입력, 자료폴더: 자리.자료 } : undefined, 원장.반영),
      env: 결제환경(환경, 키),
      uid: 자식?.uid,
      gid: 자식?.gid,
      조용한제한: 자식제한,
      신호,
      흘림: true,
      // 이벤트 줄을 그대로 흘리면 훑은 화면 글·계정 원문이 로그에 남는다 — 도구 이름과 글 첫 줄만
      흘림줄: (줄) => {
        const 글 = 누적.먹기(줄);
        return 글 === null ? null : `[작성] ${것.id}번 ${글}`;
      },
    }),
  ), (까닭) => console.log(`[작성] ${것.id}번 API 크레딧으로 못 띄웠다(${사유거르기(까닭, 것.target?.loginPassword)}) — 구독으로 다시 띄운다`));
  const 단계 = 누적.단계표(); // 거절 · 시간초과 · 멈춤 · 끊김에도 남게 어떤 return · 사용량보고보다 먼저 (AUT-F3-21)
  console.log(`[작성] ${것.id}번 단계 시각\n${단계 || '단계 표지 없음'}`);
  // 에이전트가 거절로 멈추는 중이면 자식을 죽인 것이다 — 서버도 받아 주지 않으니 보고하지 않는다
  if (멈춤.까닭 !== null) return;
  // ★ 어떤 끝내기보다 먼저 — 끝난 행에는 서버가 409 라 시간초과 건의 토큰이 버려진다 (작성 §7 「토큰 사용량」).
  // claude 가 아예 안 떴으면 쓴 토큰이 없다 — 0 을 보내면 「돌렸는데 0」으로 읽혀 대시보드 중간값을 끌어내린다
  const 안떴다 = 돌린것.코드 === null && !돌린것.시간초과 && !돌린것.멈춤으로죽음;
  const 풀린 = 안떴다 ? 흐름풀기(돌린것.낸것) : await 사용량보고({ 주소기지, 토큰 }, 서비스, 것.id, 돌린것.낸것);
  // 검사 전에 자식이 남긴 것을 전부 죽인다 — 살아 있으면 검사한 뒤에 파일을 바꿔치기한다
  if (!(await 자식거두기(자식))) {
    await 손.끝내기({ status: 'FAILED', error: '자식이 남긴 프로세스를 거두지 못했다 — 올리지 않는다' });
    return;
  }
  if (안떴다) {
    // 자식 stderr 에 계정 원문이 섞일 수 있다 — 사유는 화면과 서버 기록에 남는다
    const 끝줄 = 돌린것.오류.trim().split('\n').pop() ?? '';
    await 손.끝내기({ status: 'FAILED', error: 사유거르기(`claude 를 못 띄웠다: ${끝줄}`, 것.target?.loginPassword) });
    return;
  }
  // 멈춤·시간초과·한도는 STOPPED — 다시 하면 이어질 수 있다. 한도는 stream 이 아니라 결과 글과 표준 오류로만 본다. 크레딧이 도중에 떨어진 것도 한도다(이어하기가 바로 구독으로 넘어간다)
  const 끝낼것 = 끝낼상태(돌린것, 한도걸렸나(풀린.글, 돌린것.오류) || (크레딧으로 && 크레딧바닥났나(풀린.글, 돌린것.오류)));
  if (끝낼것 !== null) {
    await 손.끝내기(끝낼것);
    return;
  }
  // 옮긴 표준 기획서는 PR 을 만들기 전에 올리고 표의 임시 번호를 받은 번호로 바꾼다 — 판 · 대조 줄이 PR 본문 머리에 실리고 원장은 올린 판이다.
  // 못 올리면 올리기 거절 — 표가 판에 없는 번호를 가리킨다. 멈춤 · 한도로 끝났으면 위에서 나가 이어하기가 이어 쓴다. 화면이 맞음은 고친 번호만 올린다
  const 옮김 = !옮긴다 ? await 안옮김뒤({ 주소기지, 토큰 }, 서비스, 것.id, 자리, 기획서.앞판, 원장, { 피그마: 것.figmaToken, 계정: 것.target?.loginPassword }, 케이스자리)
    : await 옮기기올리기({ 주소기지, 토큰 }, 서비스, 것.id, 자리, 기획서.앞판, 원장.원본원장, { 피그마: 것.figmaToken, 계정: 것.target?.loginPassword }, 원장.기준표, 케이스자리);
  if ('거절' in 옮김) {
    console.log(`[작성] ${것.id}번 표준 기획서를 못 올려 거절한다\n${옮김.줄.join('\n')}`);
    return void (await 손.끝내기(거절로(사유거르기(옮김.거절, 것.target?.loginPassword))));
  }

  // 보류 케이스와 원장 셈은 자식의 말이 아니라 코드에서 계산해 끝내기에 싣는다 — 싣는 손은 올리기가 건다 (작성 §3.6)
  await 올리기(
    자리, 것, 서비스, 판.판정, 기준, 풀린.글, 손,
    역방향 === undefined ? undefined : { 주소기지, 토큰, 자식, 입력자료: 자료들 },
    { 값: 옮김.원장, 폴더: 케이스자리, 자식, 기준: 옮김.기준 }, 단계, 옮김.줄,
  );
}
