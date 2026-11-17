export default function TopBar({ onBack, title, children, theme }) {
  return (
    <div className="topbar" style={{ '--main': theme?.main, '--soft': theme?.soft, '--deep': theme?.deep }}>
      <button className="icon-btn" onClick={onBack} aria-label="Back">
        ←
      </button>
      <div className="topbar-title">{title}</div>
      <div className="topbar-extra">{children}</div>
    </div>
  );
}
