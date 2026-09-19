// 설정 화면의 계정 구획 (SPEC §8.8). 아이디·이름·등급·배정 서비스
// 비밀번호는 사람이 타이핑하지 않는다 — 시스템이 만들어 한 번만 보여준다

import { useState } from 'react';

import { api, type SettingsServiceRow, type UserRow } from './api.js';
import type { 등급 } from './role.js';
import { TempPassword, type 임시 } from './SettingsPassword.js';
import { 오류문장 } from './SettingsService.js';
import { 계정못보내는이유, 마지막운영계정인가 } from './settingsView.js';

const 등급이름: Record<등급, string> = { viewer: '보기만', operator: '실행까지', admin: '운영' };
const 등급들: 등급[] = ['viewer', 'operator', 'admin'];

export function UserSection({
  rows,
  services,
  me,
  onDone,
  onSelf,
}: {
  rows: UserRow[];
  services: SettingsServiceRow[];
  /** 지금 로그인한 사람의 아이디. 자기 자신을 고치면 띠까지 다시 그려야 한다 */
  me: string;
  onDone: () => void;
  onSelf: () => void;
}) {
  const [여는것, set여는것] = useState<string | 'new' | null>(null);
  // 만든 직후 한 번만 보여준다. 닫으면 다시 못 본다 (SPEC §8.8)
  const [임시비밀번호, set임시비밀번호] = useState<임시 | null>(null);

  // 내가 배정받은 서비스가 없으면 그것부터 알린다. 첫 운영자가 이 화면에 오는 가장 흔한 이유다
  const 내배정없음 = rows.find((it) => it.username === me)?.services.length === 0;

  return (
    <section className="sec">
      <div className="sec-h">
        <span>계정</span>
        <button className="btn ghost" onClick={() => set여는것(여는것 === 'new' ? null : 'new')}>
          {여는것 === 'new' ? '닫기' : '더하기'}
        </button>
      </div>

      {내배정없음 && services.length > 0 ? (
        <div className="hint set-todo">
          아직 자기 자신에게 배정한 서비스가 없습니다. 아래 자기 줄의 「고치기」에서 배정합니다
        </div>
      ) : null}

      {임시비밀번호 === null ? null : (
        <TempPassword 것={임시비밀번호} onClose={() => set임시비밀번호(null)} />
      )}

      {여는것 === 'new' ? (
        <UserForm
          services={services}
          onCreated={(username, password) => {
            set임시비밀번호({ username, password });
            set여는것(null);
            onDone();
          }}
        />
      ) : null}

      {rows.map((it) => (
        <div key={it.username}>
          <div className="set-row">
            <span className="set-swatch set-none" aria-hidden="true" />
            <span className="set-name">
              {it.displayName}
              {it.isActive ? null : <span className="set-off">비활성</span>}
            </span>
            <span className="set-sub">{it.username}</span>
            <span className="set-sub">
              {it.services.length === 0 ? '배정 없음' : it.services.join(' · ')}
            </span>
            <span className="set-sub">{등급이름[it.role]}</span>
            <button
              className="btn ghost"
              onClick={() => set여는것(여는것 === it.username ? null : it.username)}
            >
              {여는것 === it.username ? '닫기' : '고치기'}
            </button>
          </div>
          {여는것 === it.username ? (
            <UserForm
              row={it}
              rows={rows}
              services={services}
              onDone={() => {
                set여는것(null);
                onDone();
                // 자기 자신을 고쳤으면 띠와 등급도 다시 읽는다
                if (it.username === me) onSelf();
              }}
              onPassword={(password) => set임시비밀번호({ username: it.username, password })}
            />
          ) : null}
        </div>
      ))}
    </section>
  );
}

function UserForm({
  row,
  rows = [],
  services,
  onDone,
  onCreated,
  onPassword,
}: {
  row?: UserRow;
  rows?: UserRow[];
  services: SettingsServiceRow[];
  onDone?: () => void;
  onCreated?: (username: string, password: string) => void;
  onPassword?: (password: string) => void;
}) {
  const 새것 = row === undefined;
  const [username, setUsername] = useState(row?.username ?? '');
  const [displayName, setDisplayName] = useState(row?.displayName ?? '');
  const [role, setRole] = useState<등급>(row?.role ?? 'viewer');
  const [배정, set배정] = useState<string[]>(row?.services ?? []);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 되돌릴 수 없는 일이라 두 걸음으로 받는다. 저장 버튼 바로 옆이라 잘못 누르기 쉽다
  const [비번확인, set비번확인] = useState(false);

  // 맞으면 등급을 낮추거나 내리는 길을 아예 안 그린다 (SPEC §3.5 · §7)
  const 마지막운영 = row !== undefined && 마지막운영계정인가(rows, row.username);
  const 못보내는이유 = 계정못보내는이유({ username, displayName });

  async function 한다(일: () => Promise<void>) {
    set보내는중(true);
    setErr(null);
    try {
      await 일();
    } catch (e) {
      setErr(오류문장(e));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-form">
      <div className="field">
        <label htmlFor="uf-id">아이디</label>
        <input
          id="uf-id"
          type="text"
          value={username}
          disabled={!새것}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kim"
        />
      </div>

      <div className="field">
        <label htmlFor="uf-name">이름</label>
        <input
          id="uf-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="김철수"
        />
      </div>

      <div className="field">
        <label htmlFor="uf-role">등급</label>
        <div>
          {마지막운영 ? (
            <div className="hint">
              <b>운영</b> — 마지막 운영 계정이라 등급을 낮출 수 없습니다. 먼저 다른 사람을 운영으로 올립니다
            </div>
          ) : (
            <select id="uf-role" value={role} onChange={(e) => setRole(e.target.value as 등급)}>
              {등급들.map((it) => (
                <option key={it} value={it}>
                  {등급이름[it]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="field">
        <span className="field-label">서비스</span>
        <div className="set-picks" role="group" aria-label="배정할 서비스">
          {services.length === 0 ? (
            <span className="hint">먼저 서비스를 만듭니다</span>
          ) : (
            services.map((s) => (
              <label key={s.prefix} className="set-pick">
                <input
                  type="checkbox"
                  checked={배정.includes(s.prefix)}
                  onChange={(e) =>
                    set배정(
                      e.target.checked ? [...배정, s.prefix] : 배정.filter((p) => p !== s.prefix),
                    )
                  }
                />
                {s.name}
              </label>
            ))
          )}
          <div className="hint">배정받지 않은 서비스는 그 사람의 띠에 뜨지 않습니다</div>
        </div>
      </div>

      {새것 ? (
        <div className="field">
          <span />
          <div className="hint">
            비밀번호는 시스템이 만듭니다. 만든 직후 <b>한 번만</b> 보여 줍니다
          </div>
        </div>
      ) : null}

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {새것 ? null : (
          <>
            {/* 되돌릴 수 없다. 왼쪽 끝으로 떼어 놓고 두 걸음으로 받는다 */}
            <button
              className={`btn ghost set-left${비번확인 ? ' set-warn' : ''}`}
              disabled={보내는중}
              onClick={() => {
                if (!비번확인) {
                  set비번확인(true);
                  return;
                }
                set비번확인(false);
                void 한다(async () => {
                  const { tempPassword } = await api.resetPassword(row.username);
                  onPassword?.(tempPassword);
                });
              }}
            >
              {비번확인 ? '한 번 더 누르면 지금 비밀번호가 무효가 됩니다' : '비밀번호 다시 만들기'}
            </button>
            {마지막운영 ? null : (
              <button
                className="btn ghost"
                disabled={보내는중}
                onClick={() => {
                  void 한다(async () => {
                    await api.updateUser(row.username, { isActive: !row.isActive });
                    onDone?.();
                  });
                }}
              >
                {row.isActive ? '비활성으로 내리기' : '다시 활성으로'}
              </button>
            )}
          </>
        )}
        {/* 버튼은 살아 있고 왜 안 되는지를 아래에 말한다 (SPEC §8.2 · DESIGN.md) */}
        <button
          className="btn"
          disabled={보내는중}
          onClick={() => {
            if (못보내는이유 !== null) return;
            void 한다(async () => {
              if (새것) {
                const { tempPassword } = await api.createUser({ username, displayName, role, services: 배정 });
                onCreated?.(username, tempPassword);
              } else {
                await api.updateUser(row.username, { displayName, role, services: 배정 });
                onDone?.();
              }
            });
          }}
        >
          {새것 ? '계정 만들기' : '저장'}
        </button>
      </div>
      {못보내는이유 === null ? null : <div className="hint set-why">{못보내는이유}</div>}
    </div>
  );
}
