// 실패 카드 맨 아래 「판정」 줄 — 판정이 있으면 결과 한 줄, 없으면 테스트 작성 「결정 필요」로 가는 고리 (도메인/리포팅 「실패 요구사항」 · 작성 §3.6 「★ 결정 목록」 「빠지는 것」)
// 「화면이 맞음」 · 「버그」를 고르는 자리는 결정 목록 하나다(2026-10-26). 버그 뒤 「화면이 맞음으로 바꾸기」만 남아 결정 진행 통로로 그 하나를 보낸다

import { useEffect, useState } from 'react';

import type { FailureCase, FailureJudgment } from './api.js';
import { decideApi } from './decideApi.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { prdApi } from './prdApi.js';
import { 케이스서비스, type 판정 } from './role.js';
import { 결정필요주소 } from './route.js';
import { message, when } from './ui.js';

interface Props {
  c: FailureCase;
  runId: number;
  권한: 판정;
  /** 눌러서 서버가 판정을 남겼을 때. 부르는 쪽이 카드 재료를 다시 읽어 사람 이름 · 요청 번호를 서버 값으로 맞춘다 */
  on남김: () => void;
}

export function RunFailJudge({ c, runId, 권한, on남김 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const 서비스 = 케이스서비스(c.tcId);
  const [직접, set직접] = useState<FailureJudgment>(null);
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [묻는중, set묻는중] = useState(false);
  // 방금 누른 것은 서버 값이 올 때까지 바로 보이고, 카드 재료를 다시 읽어 새 값이 오면 그것이 이긴다
  useEffect(() => set직접(null), [c.judgment]);
  const 지금 = 직접 ?? c.judgment;

  // 덮는 요구 가운데 판에 있는 번호가 없으면 고칠 곳이 없다
  const 바꾸기가능 = 서비스 !== null && 지금?.kind === 'BUG' && 권한('작성요청') && c.reqs.some((r) => r.text !== null);

  async function 화면이맞음() {
    set묻는중(false);
    set바쁨(true);
    set오류(null);
    try {
      // 결정 진행은 고를 때 본 기획서 버전을 받는다 — 판 목록 맨 앞이 지금 버전이다
      const 판 = (await prdApi.versions(서비스!))[0]?.version ?? 0;
      const { steps } = await decideApi.run(서비스!, 판, [{ key: `fail:${String(runId)}:${c.tcId}`, pick: 'SCREEN' }]);
      const 요청 = steps.find((s) => s.step === 4)?.requestId;
      if (요청 != null) set직접({ kind: 'SCREEN', requestId: 요청, byName: '', at: new Date().toISOString() });
      on남김();
    } catch (err) {
      set오류(message(err, 언어));
    }
    set바쁨(false);
  }

  return (
    <div className="fc-cause">
      <span className="fc-cause-label">{t('판정')}</span>
      {지금 === null ? (
        <p className="fc-judged">
          {/* 띠가 다른 애플리케이션이어도 이 실행의 애플리케이션 결정 목록으로 간다 — 띠 것을 열면 이 실패가 없다 */}
          {권한('작성보기') ? <a href={서비스 === null ? '#/authoring?todo=1' : 결정필요주소(서비스)}>{t('테스트 작성 › 결정 필요에서 판정합니다')}</a> : t('테스트 작성 › 결정 필요에서 판정합니다')}
        </p>
      ) : (
        <p className="fc-judged">
          {지금.kind === 'SCREEN' ? (
            <>
              {t('화면이 맞음')} · <a href={`#/authoring/${String(지금.requestId)}`}>{t('작성 요청 #{번호}', { 번호: 지금.requestId })}</a>
            </>
          ) : (
            t('버그')
          )}
          {지금.byName === '' ? '' : ` · ${지금.byName}`} · {when(지금.at, 언어)}
        </p>
      )}
      {!바꾸기가능 ? null : (
        <button type="button" className="btn small" disabled={바쁨} onClick={() => set묻는중(true)}>
          {t('화면이 맞음으로 바꾸기')}
        </button>
      )}
      {!묻는중 ? null : (
        <Modal
          제목={t('화면이 맞다고 판정할까요?')}
          onClose={() => set묻는중(false)}
          버튼={
            <>
              <button type="button" className="btn ghost" onClick={() => set묻는중(false)}>
                {t('아니오')}
              </button>
              <button type="button" className="btn" disabled={바쁨} onClick={() => void 화면이맞음()}>
                {t('화면이 맞음')}
              </button>
            </>
          }
        >
          <p>{t('{번호} 가 덮는 요구를 지금 화면에 맞게 고치는 작성 요청을 바로 만듭니다.', { 번호: c.tcId })}</p>
        </Modal>
      )}
      {오류 === null ? null : (
        <span className="note" role="alert">
          {오류}
        </span>
      )}
    </div>
  );
}
