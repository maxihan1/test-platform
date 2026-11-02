// 성능 테스트 › 시나리오 목록. 만든 시나리오를 훑고 마법사로 들어간다 (도메인/성능 §8.14)

import { useState } from 'react';

import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { perfApi, type PerfScenarioRow } from './perfApi.js';
import type { 판정 } from './role.js';
import { Failed, Loading, message, useAsync, when } from './ui.js';

/** 실행 상태 글자 (§3.9 「실행 · 결과」). 판정이 있으면 판정이 먼저다 */
export const 실행상태글자: Record<string, string> = {
  QUEUED: '대기',
  SMOKE: '스모크 테스트',
  RUNNING: '실행 중',
  STOPPED: '중단',
  ERROR: '오류',
};

export function 마지막실행글자(run: PerfScenarioRow['lastRun']): string {
  if (run === null) return '실행 전';
  if (run.status === 'DONE') return run.verdict === 'PASS' ? '통과' : '실패';
  return 실행상태글자[run.status] ?? run.status;
}

export function PerfScenarioList({ serviceId, 할수 }: { serviceId: number; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();
  const 쓰나 = 할수('실행');
  const list = useAsync(() => perfApi.scenarios(serviceId), [serviceId]);
  const [지울것, set지울것] = useState<PerfScenarioRow | null>(null);
  const [지우는중, set지우는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  if (list.error !== null) return <Failed error={list.error} />;
  if (list.data === null) return <Loading />;
  const 줄들 = list.data.scenarios;

  async function 지우기(줄: PerfScenarioRow) {
    set지우는중(true);
    set오류(null);
    try {
      await perfApi.remove(줄.id);
      set지울것(null);
      await list.reload();
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set지우는중(false);
    }
  }

  return (
    <>
      <Head
        위치={t('성능 테스트')}
        제목={t('부하 테스트')}
        부제={t('시나리오 {수}개', { 수: 줄들.length })}
        행동={
          쓰나 ? (
            <a className="btn" href="#/perf/scenarios/new">
              {t('시나리오 만들기')}
            </a>
          ) : undefined
        }
      />
      <div className="screen">
        {줄들.length === 0 ? (
          <div className="empty">
            {t('아직 만든 성능 시나리오가 없습니다')}
            <small>{t('E2E 녹화 · Swagger · JMeter 파일에서 가져오면 AI 가 트랜잭션 목록을 만듭니다')}</small>
          </div>
        ) : (
          <div className="perf-panel">
            <div className="perf-table-box">
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>{t('이름')}</th>
                    <th>{t('버전')}</th>
                    <th>{t('마지막 실행')}</th>
                    <th>{t('고친 시각')}</th>
                    {쓰나 ? <th aria-label={t('삭제')} /> : null}
                  </tr>
                </thead>
                <tbody>
                  {줄들.map((줄) => (
                    <tr key={줄.id}>
                      <td>
                        <a href={`#/perf/scenarios/${String(줄.id)}`}>{줄.name}</a>
                      </td>
                      <td className="mono">v{줄.version}</td>
                      <td>
                        {t(마지막실행글자(줄.lastRun))}
                        {줄.lastRun === null ? null : <span className="perf-faint"> · {when(줄.lastRun.createdAt, 언어)}</span>}
                      </td>
                      <td className="perf-faint">{when(줄.updatedAt, 언어)}</td>
                      {쓰나 ? (
                        <td>
                          <button type="button" className="btn ghost small" aria-label={t('{이름} 삭제', { 이름: 줄.name })} onClick={() => set지울것(줄)}>
                            {t('삭제')}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {지울것 === null ? null : (
        <Modal
          제목={t('시나리오를 지울까요?')}
          onClose={() => set지울것(null)}
          버튼={
            <>
              <button type="button" className="btn ghost" onClick={() => set지울것(null)}>
                {t('취소')}
              </button>
              <button type="button" className="btn" disabled={지우는중} onClick={() => void 지우기(지울것)}>
                {t('삭제')}
              </button>
            </>
          }
        >
          <p>{t('「{이름}」을 삭제합니다. 실행 기록은 남습니다', { 이름: 지울것.name })}</p>
          {오류 === null ? null : <p className="perf-err">{오류}</p>}
        </Modal>
      )}
    </>
  );
}
