import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { LiveBuild } from './components/LiveBuild';
import { LegalPage } from './components/LegalPage';

export default function App({ path = '/' }: { path?: string }) {
  const route = path.replace(/\/$/, '') || '/';
  const home = route === '/';
  return (
    <div className="site-frame">
      {home && <LiveBuild />}
      <a href="#main" className="skip-link">Saltar al contenido</a>
      <Header home={home} />
      <main id="main">{home ? <Home /> : <LegalPage path={route} />}</main>
      <Footer />
    </div>
  );
}
