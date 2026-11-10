export function Brand({ build }: { build?: string }) {
  return (
    <a className="brand" href="/" aria-label="Stane, inicio" data-build={build}>
      <img src="/brand/stane-mark.svg" className="brand-logo" width="40" height="40" alt="" />
      <span className="brand-wordmark">Stane<span className="brand-period">.</span></span>
    </a>
  );
}
