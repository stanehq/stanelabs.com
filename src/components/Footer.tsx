import { Brand } from './Brand';
import { Icon } from './Icon';

export function Footer() {
  return (
    <footer className="footer" data-build="frame">
      <div className="container footer-inner">
        <Brand build="image" />
        <div className="footer-links" data-build="text">
          <a href="/security">Seguridad</a>
          <a href="/privacy">Privacidad</a>
          <a href="/tos">Términos</a>
          <a href="/purchase">Contratación</a>
          <a href="/.well-known/security.txt">security.txt<Icon name="arrow-up-right" size={16} /></a>
        </div>
        <span className="copyright" data-build="text">© 2026 Stane</span>
      </div>
    </footer>
  );
}
