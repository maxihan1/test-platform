// 서비스 가이드 본문 — 구획 셋의 읽기 · 구획마다 수정 · 저장 (도메인/작성 §3.6 「★ 서비스 가이드」 · 2026-11-11 시안 GuideA)
// 「PRD 관리 › 가이드」 화면과 새 작성 마법사 1단계가 같이 쓴다. 상태는 useGuideEdit 이 들고 화면은 GuideBody 가 그린다

import { useRef, useState } from 'react';

import type { GuideFile, GuideSection as 구획, ServiceGuide } from '@platform/kit';

import { ApiError } from './api.js';
import { 거절사유 } from './authoringNewText.js';
import { guideApi, type 가이드글 } from './guideApi.js';
import { GuideSection, 구획들, 구획이름 } from './GuideSection.js';
import { use말, use언어 } from './i18n.js';
import { message, useAsync } from './ui.js';

export interface 가이드상태 {
  /** 지금 버전. 읽는 중이면 null */
  now: ServiceGuide | null;
  오류: string | null;
  글: (s: 구획) => string;
  /** 그 구획의 글이 지금 버전과 다르다 */
  바뀐: (s: 구획) => boolean;
  바뀜: boolean;
  여는: ReadonlySet<구획>;
  열기: (s: 구획) => void;
  /** 고치던 글을 버리고 읽기로 돌아간다 */
  취소: (s: 구획) => void;
  on글: (s: 구획, 값: string) => void;
  /** 고른 구획만 고친 글로, 나머지는 지금 버전 글로 새 버전을 짓는다. 성공하면 참 */
  저장: (대상: readonly 구획[]) => Promise<boolean>;
  더하기: (s: 구획, file: File) => void;
  빼기: (file: GuideFile) => void;
  알림: { ok: boolean; 글: string } | null;
  busy: boolean;
}

export function useGuideEdit(service: string): 가이드상태 {
  const t = use말();
  const 언어 = use언어();
  const 판 = useAsync(() => guideApi.now(service), [service]);
  // 손댄 구획만 든다 — 다른 사람이 먼저 저장해 판을 다시 읽으면 손대지 않은 구획은 새 판 글이 보이고 그대로 보내진다
  const [초안, set초안안] = useState<Partial<가이드글>>({});
  // 저장이 오가는 동안 친 글자를 저장이 끝난 뒤에 봐야 한다 — 저장을 부른 때의 초안은 낡았다
  const 최신초안 = useRef(초안);
  const set초안 = (바꾸기: (전: Partial<가이드글>) => Partial<가이드글>) => {
    최신초안.current = 바꾸기(최신초안.current);
    set초안안(최신초안.current);
  };
  const [여는, set여는] = useState<ReadonlySet<구획>>(new Set());
  const [알림, set알림] = useState<{ ok: boolean; 글: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const now = 판.data;
  const 글 = (s: 구획) => 초안[s] ?? now?.[s] ?? '';
  const 바뀐 = (s: 구획) => now !== null && 초안[s] !== undefined && 초안[s] !== now[s];

  /** 새 버전을 짓는다. 지금 버전 번호를 넘겨 보낸다 — 그 사이 다른 저장이 있었으면 서버가 GUIDE_STALE 로 막는다 */
  async function 짓기(일: (baseVersion: number) => Promise<{ version: number }>): Promise<boolean> {
    if (now === null) return false;
    setBusy(true);
    set알림(null);
    try {
      const { version } = await 일(now.version);
      set알림({ ok: true, 글: t('저장했습니다 (버전 {버전})', { 버전: version }) });
      await 판.reload();
      return true;
    } catch (err) {
      set알림({ ok: false, 글: message(err, 언어) });
      // 다른 사람이 먼저 저장했다 — 지금 판을 다시 읽어야 다시 보낼 수 있다. 고치던 글은 남는다
      if (err instanceof ApiError && err.code === 'GUIDE_STALE') await 판.reload();
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function 저장(대상: readonly 구획[]): Promise<boolean> {
    if (now === null) return false;
    const 보낸 = Object.fromEntries(구획들.map((s) => [s, 대상.includes(s) ? 글(s) : now[s]])) as 가이드글;
    if (!(await 짓기((base) => guideApi.save(service, base, 보낸)))) return false;
    // 저장이 오가는 동안 친 글자는 보낸 글과 다르다 — 그 구획은 초안과 수정 칸에 남긴다
    set초안((전) => Object.fromEntries(구획들.filter((s) => 전[s] !== undefined && (!대상.includes(s) || 전[s] !== 보낸[s])).map((s) => [s, 전[s]])));
    const 남은 = 최신초안.current;
    set여는((전) => new Set([...전].filter((s) => !대상.includes(s) || 남은[s] !== undefined)));
    return true;
  }

  return {
    now,
    오류: 판.error,
    글,
    바뀐,
    바뀜: 구획들.some(바뀐),
    여는,
    열기: (s) => set여는((전) => new Set([...전, s])),
    취소: (s) => {
      set초안((전) => Object.fromEntries(Object.entries(전).filter(([k]) => k !== s)));
      set여는((전) => new Set([...전].filter((x) => x !== s)));
    },
    on글: (s, 값) => set초안((전) => ({ ...전, [s]: 값 })),
    저장,
    더하기: (s, file) => {
      // 서버가 거절할 파일은 보내기 전에 거른다 — 자료 올리기와 같은 규칙이되 엑셀 · CSV 는 안 받는다 (도메인/작성 §7 「자료」)
      const 사유 = 거절사유(file, true);
      if (사유 !== null) return set알림({ ok: false, 글: t(사유) });
      void 짓기((base) => guideApi.addFile(service, s, base, file));
    },
    빼기: (file) => void 짓기((base) => guideApi.removeFile(service, file.id, base)),
    알림,
    busy,
  };
}

/**
 * 구획 셋. 평소에는 읽기만 되고 「수정」을 누른 구획만 글 칸 · 첨부 · 취소 · 저장이 선다.
 * `한번에` 면 세 구획이 처음부터 글 칸이고 구획마다 단추가 없다 — 저장은 부르는 쪽(마법사 「저장하고 다음」)이 한다
 */
export function GuideBody({ service, 가이드, 쓰나, 예, 한번에 = false }: { service: string; 가이드: 가이드상태; 쓰나: boolean; 예?: string; 한번에?: boolean }) {
  const t = use말();
  const now = 가이드.now;
  if (now === null) return null;
  return (
    <>
      {가이드.알림 === null ? null : (
        <p role="status" className={가이드.알림.ok ? 'prd-note' : 'prd-note bad'}>
          {가이드.알림.글}
        </p>
      )}
      {구획들.map((s) => {
        const 수정중 = 쓰나 && (한번에 || 가이드.여는.has(s));
        const 이름 = t(구획이름[s]);
        return (
          <GuideSection
            key={s}
            service={service}
            section={s}
            글={가이드.글(s)}
            예={예}
            files={now.files.filter((f) => f.section === s)}
            busy={가이드.busy}
            // 한꺼번에 쓰는 마법사 1단계는 세 칸이 다 열려 있어 고치는 중 테두리를 두르지 않는다 — 셋 다 주황이면 무겁다
            수정중={수정중 && !한번에}
            머리행동={
              쓰나 && !수정중 ? (
                <button className="btn ghost small" aria-label={t('{구획} 수정', { 구획: 이름 })} onClick={() => 가이드.열기(s)}>
                  {t('수정')}
                </button>
              ) : null
            }
            아래={
              수정중 && !한번에 ? (
                <>
                  <button className="btn ghost" disabled={가이드.busy} onClick={() => 가이드.취소(s)}>
                    {t('취소')}
                  </button>
                  <button className="btn" disabled={!가이드.바뀐(s) || 가이드.busy} onClick={() => void 가이드.저장([s])}>
                    {t('저장')}
                  </button>
                </>
              ) : null
            }
            {...(수정중 ? { on글: (값: string) => 가이드.on글(s, 값), on더하기: (file: File) => 가이드.더하기(s, file), on빼기: 가이드.빼기 } : {})}
          />
        );
      })}
    </>
  );
}
