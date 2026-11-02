// 케이스 상세 칸의 「실행 이력」 — 실행 하나에 한 줄 (도메인/카탈로그 §8.1 「상세 칸」 · 점검 N7)

import type { 이력묶음 } from './caseDetailView.js';
import { use말, use언어 } from './i18n.js';
import { 지켜본다 } from './runWatchStore.js';
import { PLATFORM_LABEL, Verdict, when } from './ui.js';

/** 묶음 — undefined 는 받는 중, null 은 받기 실패 */
export function 실행이력칸({ 묶음 }: { 묶음: 이력묶음[] | null | undefined }) {
  const t = use말();
  const 언어 = use언어();
  return (
    <div className="dsec">
      <div className="dlabel">
        {t('실행 기록')}
        {/* 이력은 최근 한 쪽만 받는다 — 전부라고 말하지 않는다 */}
        {묶음 == null ? null : <span className="dfrom">{t('최근 실행 {건수}번', { 건수: 묶음.length })}</span>}
      </div>
      {묶음 === undefined ? (
        <p className="hint">{t('불러오는 중입니다')}</p>
      ) : 묶음 === null ? (
        <p className="hint">{t('이력을 불러오지 못했습니다')}</p>
      ) : 묶음.length === 0 ? (
        <p className="hint">{t('아직 기록이 없습니다§이력')}</p>
      ) : (
        <table className="dhist">
          <tbody>
            {묶음.map((줄) => (
              <tr key={줄.runId}>
                <td>
                  {/* 도는 한 건은 실행 기록에 줄이 없다 — 새로 고쳐 잃은 진행 창을 여기서 다시 연다 (도메인/실행 §3.2 「저장」) */}
                  {줄.한건 && 줄.도는중 ? (
                    <button type="button" className="btn small ghost" onClick={() => 지켜본다({ runId: 줄.runId, 열림: true })}>
                      {t('진행 보기')}
                    </button>
                  ) : (
                    <a href={`#/runs/${줄.runId}/items/${줄.첫항목}`}>{줄.runTitle}</a>
                  )}
                  {!줄.한건 ? null : (
                    <span className="hint">
                      {' · '}
                      {줄.붙은 === null ? t('한 건 실행') : t('RUN {번호}에 다시 실행으로 붙음', { 번호: 줄.붙은 })}
                    </span>
                  )}
                </td>
                <td>{줄.디바이스들.map((p) => t(PLATFORM_LABEL[p])).join(' · ')}</td>
                <td className="dhist-n">
                  {줄.도는중 ? (
                    t('진행 중')
                  ) : 줄.회수 === 1 ? (
                    <Verdict status={줄.실패 > 0 ? 'FAIL' : 줄.통과 > 0 ? 'PASS' : 'NA'} />
                  ) : (
                    t('{회수}번 · 실패 {실패} · 통과 {통과}', { 회수: 줄.회수, 실패: 줄.실패, 통과: 줄.통과 })
                  )}
                </td>
                <td className="mono">{when(줄.끝난때, 언어)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
