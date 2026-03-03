import Link from "next/link";
import { CookieSettings } from "./CookieSettings";

export default function PrivacyPage() {
  return (
    <main className="clipping-body" style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem' }}>
      <Link 
        href="/" 
        style={{ 
          color: 'var(--ink)', 
          textDecoration: 'underline',
          fontSize: '0.875rem',
          display: 'inline-block',
          marginBottom: '1rem'
        }}
      >
        ← Back to game
      </Link>

      <h1 className="headline" style={{ marginBottom: '1.5rem' }}>Privacy Notice</h1>
      
      <p className="drop-cap">This game uses cookies and analytics to understand how people play. We don't sell your data.</p>

      <h2 className="headline" style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>What we collect</h2>
      <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
        <li><strong>Analytics:</strong> We use PostHog to understand game usage (no personal data, just aggregated stats)</li>
        <li><strong>Cookies:</strong> A simple session cookie to track anonymous play sessions</li>
      </ul>

      <h2 className="headline" style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Cookie Settings</h2>
      <p>Manage your cookie preferences below:</p>
      <CookieSettings />

      <h2 className="headline" style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>Contact</h2>
      <p>Questions? Reach out however you found this game.</p>

      <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--ink)', opacity: 0.7 }}>
        Last updated: March 2026
      </p>
    </main>
  );
}
