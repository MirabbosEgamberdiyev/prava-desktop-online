import { useState } from "react";
import { login } from "../api";
import { saveTokens } from "../auth";
import { UserResponse } from "../types";

interface Props {
  onLoggedIn: (user: UserResponse) => void;
  onGoRegister: () => void;
}

export default function LoginScreen({ onLoggedIn, onGoRegister }: Props) {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]     = useState(false);
  const [error,      setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Email/telefon va parolni kiriting");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await login(identifier.trim(), password);
      saveTokens(res.accessToken, res.refreshToken, res.user);
      onLoggedIn(res.user);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="license-screen">
      <div className="license-card">
        <div className="license-logo">
          <img src="/logo.png" alt="Prava" onError={(e) => (e.currentTarget.style.display = "none")} />
          <h2 style={{ margin: 0 }}>Prava Online</h2>
          <p>Haydovchilik imtihoniga tayyorlanish</p>
        </div>

        <form onSubmit={handleSubmit} className="license-form">
          <div className="form-group">
            <label>Email yoki telefon</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+998901234567 yoki email@gmail.com"
              className="license-input"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Parol</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolni kiriting"
              className="license-input"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button
            type="submit"
            className="activate-btn"
            disabled={loading || !identifier.trim() || !password.trim()}
          >
            {loading ? "Kirish..." : "Kirish"}
          </button>
        </form>

        <div className="machine-id-section">
          <button type="button" className="machine-id-btn" onClick={onGoRegister}>
            Akkount yo'qmi? Ro'yxatdan o'tish
          </button>
        </div>
      </div>
    </div>
  );
}
