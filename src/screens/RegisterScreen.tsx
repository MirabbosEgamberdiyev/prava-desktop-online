import { useState } from "react";
import { register } from "../api";
import { saveTokens } from "../auth";
import { UserResponse } from "../types";

interface Props {
  onRegistered: (user: UserResponse) => void;
  onGoLogin: () => void;
}

export default function RegisterScreen({ onRegistered, onGoLogin }: Props) {
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) { setError("Ismingizni kiriting"); return; }
    if (!phoneNumber.trim()) { setError("Telefon raqamini kiriting"); return; }
    if (!password.trim()) { setError("Parolni kiriting"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await register(
        firstName.trim(),
        phoneNumber.trim(),
        password,
        lastName.trim() || undefined
      );
      saveTokens(res.accessToken, res.refreshToken, res.user);
      onRegistered(res.user);
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
          <p>Ro'yxatdan o'tish</p>
        </div>

        <form onSubmit={handleSubmit} className="license-form">
          <div className="form-group">
            <label>Ism *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ismingizni kiriting"
              className="license-input"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Familiya (ixtiyoriy)</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familiyangizni kiriting"
              className="license-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Telefon raqam *</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+998901234567"
              className="license-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Parol *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kamida 8 ta belgi"
              className="license-input"
              disabled={loading}
            />
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
              Kamida 8 belgi: katta harf, kichik harf, raqam va maxsus belgi (@$!%*?&)
            </p>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <button
            type="submit"
            className="activate-btn"
            disabled={loading || !firstName.trim() || !phoneNumber.trim() || !password.trim()}
          >
            {loading ? "Ro'yxatdan o'tilmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <div className="machine-id-section">
          <button type="button" className="machine-id-btn" onClick={onGoLogin}>
            Akkount bor? Kirish
          </button>
        </div>
      </div>
    </div>
  );
}
