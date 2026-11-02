// 설정 › 성능 에이전트 — 부하 발생 · 모니터링 에이전트 목록 · 이름과 최대 가상 사용자 고치기 · 지우기 · 붙이기(토큰은 한 번만) (도메인/성능 §8.14 · 도메인/인증 §8.8)
// 더미 클라이언트 구획은 SettingsPerfDummy.tsx 가 이 아래에 선다

import { useState, type ReactNode } from 'react';

import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { perfApi, type PerfAgent } from './perfApi.js';
import { Failed, Loading, message, useAsync, when } from './ui.js';

export function 실행상태(a: PerfAgent): string {
  if (a.status === 'OFFLINE') return '연결 끊김';
  if (a.status === 'BUSY') return '실행 중';
  return a.mode === 'LOAD' ? '대기' : '연결됨';
}

const 역할글자: Record<PerfAgent['mode'], string> = { LOAD: '부하 발생', MONITOR: '모니터링' };

// 아래 — 같은 패널 안에 이어 붙일 구획(더미 클라이언트)
export function SettingsPerfAgents({ projects, 아래 }: { projects: { id: number; name: string }[]; 아래?: ReactNode }) {
  const t = use말();
  const 언어 = use언어();
  const list = useAsync(() => perfApi.agents(), []);
  const [고칠, set고칠] = useState<{ id: number; name: string; maxVus: string } | null>(null);
  const [지울것, set지울것] = useState<PerfAgent | null>(null);
  const [오류, set오류] = useState<string | null>(null);

  if (list.error !== null) return <Failed error={list.error} />;
  if (list.data === null) return <Loading />;
  const 줄들 = list.data.agents;

  async function 해보기(일: () => Promise<unknown>, 끝: () => void) {
    set오류(null);
    try {
      await 일();
      끝();
      await list.reload();
    } catch (err) {
      set오류(message(err, 언어));
    }
  }

  return (
    <div className="set-panel">
      <h2 className="set-panel-h">{t('성능 에이전트')}</h2>
      <div className="set-card">
        <div className="set-card-h">
          <h3>{t('등록된 에이전트')}</h3>
          <p>{t('Test Commander 가 보낸 테스트만 실행하고 대상 서버로 등록된 주소에만 부하를 보냅니다')}</p>
        </div>
        {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
        {줄들.length === 0 ? (
          <div className="empty">{t('아직 붙은 에이전트가 없습니다')}</div>
        ) : (
          <div className="perf-table-box">
            <table className="perf-table">
              <thead>
                <tr>
                  <th>{t('이름')}</th>
                  <th>{t('역할')}</th>
                  <th>{t('호스트')}</th>
                  <th>{t('상태')}</th>
                  <th>{t('최대 가상 사용자')}</th>
                  <th>{t('최근 접속')}</th>
                  <th aria-label={t('편집')} />
                </tr>
              </thead>
              <tbody>
                {줄들.map((a) =>
                  고칠?.id === a.id ? (
                    <tr key={a.id} className="perf-open">
                      <td>
                        <input aria-label={t('이름')} value={고칠.name} maxLength={100} onChange={(e) => set고칠({ ...고칠, name: e.target.value })} />
                      </td>
                      <td>{t(역할글자[a.mode])}</td>
                      <td className="mono">{a.host ?? '-'}</td>
                      <td>{t(실행상태(a))}</td>
                      <td>
                        {a.mode === 'LOAD' ? (
                          <input className="perf-num" type="number" min={1} aria-label={t('최대 가상 사용자')} value={고칠.maxVus} onChange={(e) => set고칠({ ...고칠, maxVus: e.target.value })} />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="perf-faint">{when(a.lastSeenAt, 언어)}</td>
                      <td>
                        <div className="perf-row">
                          <button
                            type="button"
                            className="btn small"
                            onClick={() =>
                              void 해보기(
                                () => perfApi.editAgent(a.id, { name: 고칠.name.trim(), ...(a.mode === 'LOAD' && 고칠.maxVus !== '' && { maxVus: Number(고칠.maxVus) }) }),
                                () => set고칠(null),
                              )
                            }
                          >
                            {t('저장')}
                          </button>
                          <button type="button" className="btn ghost small" onClick={() => set고칠(null)}>
                            {t('취소')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>
                        <span className="perf-tag">{t(역할글자[a.mode])}</span>
                      </td>
                      <td className="mono">{a.host ?? '-'}</td>
                      <td>{t(실행상태(a))}</td>
                      <td className="mono">{a.maxVus === null ? '-' : a.maxVus.toLocaleString()}</td>
                      <td className="perf-faint">{when(a.lastSeenAt, 언어)}</td>
                      <td>
                        <div className="perf-row">
                          <button type="button" className="btn ghost small" aria-label={t('{이름} 편집', { 이름: a.name })} onClick={() => set고칠({ id: a.id, name: a.name, maxVus: a.maxVus === null ? '' : String(a.maxVus) })}>
                            {t('편집')}
                          </button>
                          <button type="button" className="btn ghost small" aria-label={t('{이름} 삭제', { 이름: a.name })} onClick={() => set지울것(a)}>
                            {t('삭제')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <에이전트추가 projects={projects} 붙음={() => void list.reload()} />
      {아래}
      {지울것 === null ? null : (
        <Modal
          제목={t('에이전트를 지울까요?')}
          onClose={() => set지울것(null)}
          버튼={
            <>
              <button type="button" className="btn ghost" onClick={() => set지울것(null)}>
                {t('취소')}
              </button>
              <button type="button" className="btn" onClick={() => void 해보기(() => perfApi.removeAgent(지울것.id), () => set지울것(null))}>
                {t('삭제')}
              </button>
            </>
          }
        >
          <p>{t('「{이름}」을 지우면 그 토큰도 끊겨 다시 붙이려면 새로 설치해야 합니다', { 이름: 지울것.name })}</p>
        </Modal>
      )}
    </div>
  );
}

function 에이전트추가({ projects, 붙음 }: { projects: { id: number; name: string }[]; 붙음: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [mode, setMode] = useState<PerfAgent['mode']>('LOAD');
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [명령, set명령] = useState<string | null>(null);
  const [복사함, set복사함] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  async function 추가() {
    set오류(null);
    if (name.trim() === '' || (mode === 'MONITOR' && projectId === '')) {
      set오류(mode === 'MONITOR' ? t('이름과 프로젝트를 정해 주세요') : t('이름을 적어 주세요'));
      return;
    }
    try {
      const r = await perfApi.addAgent(name.trim(), mode, mode === 'MONITOR' ? Number(projectId) : undefined);
      set명령(r.installCommand);
      set복사함(false);
      setName('');
      붙음();
    } catch (err) {
      set오류(message(err, 언어));
    }
  }

  return (
    <div className="set-card">
      <div className="set-card-h">
        <h3>{t('에이전트 추가')}</h3>
        <p>{t('부하 발생은 부하를 보낼 기계에, 모니터링은 대상 서버에 설치합니다. 프로그램은 같습니다')}</p>
      </div>
      <div className="perf-fields">
        <div className="perf-field" role="radiogroup" aria-label={t('역할')}>
          {t('역할')}
          <span className="perf-row">
            {(['LOAD', 'MONITOR'] as const).map((m) => (
              <label key={m}>
                <input type="radio" name="perf-agent-mode" checked={mode === m} onChange={() => setMode(m)} /> {t(역할글자[m])}
              </label>
            ))}
          </span>
        </div>
        <label className="perf-field">
          {t('이름')}
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </label>
        {mode === 'MONITOR' ? (
          <label className="perf-field">
            {t('프로젝트')}
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{t('고르기')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="btn" onClick={() => void 추가()}>
          {t('추가')}
        </button>
      </div>
      {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
      {명령 === null ? null : (
        <div className="perf-well">
          <span className="perf-field">{t('설치 명령')}</span>
          <div className="perf-cmd">
            <code>{명령}</code>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => void navigator.clipboard.writeText(명령).then(() => set복사함(true), () => set복사함(false))}
            >
              {복사함 ? t('복사함') : t('복사')}
            </button>
          </div>
          <span className="perf-faint">{t('토큰은 지금 한 번만 보입니다. 설치할 기계에서 실행하면 목록에 나타납니다')}</span>
        </div>
      )}
    </div>
  );
}
