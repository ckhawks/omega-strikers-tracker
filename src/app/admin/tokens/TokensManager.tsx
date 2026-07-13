"use client";

import { useState } from "react";
import { createToken, revokeToken, reactivateToken } from "@/actions/tokens";

export default function TokensManager({ tokens }: { tokens: any[] }) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<{ label: string; token: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || busy) return;
    setBusy(true);
    const res = await createToken(label);
    setBusy(false);
    if (!res.error && res.token) {
      setJustCreated({ label: label.trim(), token: res.token });
      setLabel("");
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    } catch {}
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <form onSubmit={add} style={{ display: "flex", gap: 8, margin: "1rem 0" }}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Friend name / device (e.g. syduck)"
          style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={busy || !label.trim()}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "#1f7a3f",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {busy ? "Adding…" : "Add + generate token"}
        </button>
      </form>

      {justCreated && (
        <div
          style={{
            background: "#eef7f0",
            border: "1px solid #1f7a3f",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Token for {justCreated.label} — copy it now:
          </div>
          <code style={{ wordBreak: "break-all" }}>{justCreated.token}</code>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => copy(justCreated.token)} style={btn}>
              {copied === justCreated.token ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ fontSize: "0.85em", color: "#555", marginTop: 8 }}>
            Put it in their mod: <code>local TOKEN = &quot;{justCreated.token}&quot;</code>
          </div>
        </div>
      )}

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Token</th>
            <th>Status</th>
            <th>Last used</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.id} style={{ opacity: t.active ? 1 : 0.5 }}>
              <td>{t.label}</td>
              <td>
                <code style={{ fontSize: "0.8em" }}>{t.token.slice(0, 10)}…{t.token.slice(-4)}</code>{" "}
                <button onClick={() => copy(t.token)} style={btnSmall}>
                  {copied === t.token ? "✓" : "copy"}
                </button>
              </td>
              <td>{t.active ? "Active" : "Revoked"}</td>
              <td style={{ fontSize: "0.85em", color: "#777" }}>
                {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : "never"}
              </td>
              <td>
                {t.active ? (
                  <button onClick={() => revokeToken(t.id)} style={btnDanger}>
                    Revoke
                  </button>
                ) : (
                  <button onClick={() => reactivateToken(t.id)} style={btnSmall}>
                    Reactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
          {tokens.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: "#999" }}>
                No tokens yet — add a friend above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #1f7a3f",
  background: "white",
  cursor: "pointer",
};
const btnSmall: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 4,
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
  fontSize: "0.8em",
};
const btnDanger: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 4,
  border: "1px solid #b33",
  background: "white",
  color: "#b33",
  cursor: "pointer",
};
