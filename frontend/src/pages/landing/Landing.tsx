import { Link } from 'react-router';
import { SignupForm } from './SignupForm';
import './Landing.css';

export function Landing() {
  return (
    <div className="landing">
      <main>
        <section className="landing-section landing-hero">
          <div className="container landing-hero-grid">
            <div>
              <h1>Ritma<span>.</span></h1>
              <p>Randevularınızı ve müşterilerinizi tek yerden, kendi ritminizde yönetin.</p>
              <a className="cta" href="#erken-erisim">Erken erişim için kaydol</a>
            </div>
            <div className="landing-preview" role="img" aria-label="Ritma uygulama önizlemesi">
              <div className="landing-pv-bar" aria-hidden="true"><i></i><i></i><i></i></div>
              <div className="landing-pv-body" aria-hidden="true">
                <div className="landing-pv-days">
                  <div><b>Pzt</b>
                    <div className="landing-pv-slot">10:00<small>Ayşe K.</small></div>
                    <div className="landing-pv-slot free">14:00 boş</div></div>
                  <div><b>Sal</b>
                    <div className="landing-pv-slot free">09:30 boş</div>
                    <div className="landing-pv-slot">13:00<small>Can D.</small></div></div>
                  <div><b>Çar</b>
                    <div className="landing-pv-slot">11:30<small>Elif T.</small></div>
                    <div className="landing-pv-slot">15:00<small>Mert A.</small></div></div>
                </div>
                <div className="landing-pv-card">
                  <div className="landing-pv-avatar">A</div>
                  <strong>Ayşe K.</strong>
                  <p>Son görüşme: 3 gün önce</p>
                  <p>Not: Haftalık seans tercih ediyor.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="sorun-cozum">
          <div className="container">
            <span className="landing-tag">Sorun ve çözüm</span>
            <h2>Randevu takibi neden bu kadar dağınık?</h2>
            <div className="landing-grid">
              <div className="landing-card">
                <h3>Sorun</h3>
                <ul>
                  <li>Dağınık not defterleri ve tablolar</li>
                  <li>WhatsApp'ta randevu kovalamak</li>
                  <li>Unutulan müşteri notları</li>
                </ul>
              </div>
              <div className="landing-card">
                <h3>Çözüm</h3>
                <p>Takviminiz ve müşteri geçmişiniz tek yerde. Kimin ne zaman geleceğini ve son seansta ne konuştuğunuzu hemen görürsünüz.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="nasil-calisir">
          <div className="container">
            <span className="landing-tag">Nasıl çalışır</span>
            <h2>Üç adımda kendi ritminiz</h2>
            <div className="landing-grid">
              <div className="landing-card"><div className="landing-badge">1</div><h3>Müsait saatlerini belirle</h3><p>Haftanın hangi saatlerinde çalıştığını bir kez ayarla.</p></div>
              <div className="landing-card"><div className="landing-badge">2</div><h3>Müşterilerin randevu alsın</h3><p>Müşterilerin boş saatlerden birini seçip sana kolayca ulaşsın.</p></div>
              <div className="landing-card"><div className="landing-badge">3</div><h3>Notları ve geçmişi tek yerden takip et</h3><p>Her müşterinin geçmişi ve notları yanında dursun.</p></div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="erken-erisim">
          <div className="container">
            <span className="landing-tag">Erken erişim</span>
            <h2>Listeye ilk yazılanlardan ol</h2>
            <p className="landing-lead">Ritma hazır olduğunda ilk sana haber verelim.</p>
            <SignupForm />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <div>© 2026 Ritma · Kendi ritminizde.</div>
          <nav>
            <a href="#sorun-cozum">Sorun ve çözüm</a>
            <a href="#nasil-calisir">Nasıl çalışır</a>
            <a href="#erken-erisim">Erken erişim</a>
            <Link to="/giris">Giriş</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
