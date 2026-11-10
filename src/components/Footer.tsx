import { useI18n } from '../i18n/I18nProvider';
import { Brand } from './Brand';
import { LanguageSwitch } from './LanguageSwitch';

export function Footer() {
  const { t, href } = useI18n();
  return (
    <footer className="footer" data-build="frame">
      <div className="container footer-inner">
        <Brand build="image" />
        <div className="footer-links" data-build="text">
          <a href={href('/security')}>{t.footer.security}</a>
          <a href={href('/privacy')}>{t.footer.privacy}</a>
          <a href={href('/tos')}>{t.footer.terms}</a>
          <a href={href('/purchase')}>{t.footer.purchase}</a>
        </div>
        <LanguageSwitch />
        <span className="copyright" data-build="text">© 2026 Stane</span>
      </div>
    </footer>
  );
}
