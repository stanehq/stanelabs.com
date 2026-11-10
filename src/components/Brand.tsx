import { useI18n } from '../i18n/I18nProvider';

export function Brand({ build }: { build?: string }) {
  const { t, href } = useI18n();
  return (
    <a className="brand" href={href('/')} aria-label={t.common.brandHome} data-build={build}>
      <img src="/brand/stane-mark.svg" className="brand-logo" width="40" height="40" alt="" />
      <span className="brand-wordmark">Stane<span className="brand-period">.</span></span>
    </a>
  );
}
