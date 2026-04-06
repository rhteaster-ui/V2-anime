const { useEffect, useMemo, useState } = React;

const API_BASE = '/api';
const PROFILE_IMAGE = 'https://res.cloudinary.com/dwiozm4vz/image/upload/v1772959730/ootglrvfmykn6xsto7rq.png';

const HOME_CATEGORIES = [
  { key: 'latest', title: 'Latest Update', query: null },
  { key: 'action', title: 'Action Zone', query: 'action' },
  { key: 'romance', title: 'Romance Picks', query: 'romance' },
  { key: 'fantasy', title: 'Fantasy Realm', query: 'fantasy' },
  { key: 'donghua', title: 'Donghua Radar', query: 'donghua' }
];

function App() {
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [sections, setSections] = useState({});
  const [detail, setDetail] = useState(null);
  const [watch, setWatch] = useState(null);
  const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem('bookmarks') || '[]'));
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('watchHistory') || '[]'));
  const [activeSchedule] = useState([
    { day: 'Senin', genres: ['Action', 'Fantasy', 'Isekai'] },
    { day: 'Selasa', genres: ['Comedy', 'School', 'Slice of Life'] },
    { day: 'Rabu', genres: ['Romance', 'Drama', 'Shounen'] },
    { day: 'Kamis', genres: ['Adventure', 'Supernatural', 'Mystery'] },
    { day: 'Jumat', genres: ['Sci-fi', 'Psychological', 'Seinen'] },
    { day: 'Sabtu', genres: ['Sports', 'Music', 'Magic'] },
    { day: 'Minggu', genres: ['Family', 'Historical', 'Mecha'] }
  ]);

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 20)));
  }, [history]);

  useEffect(() => {
    loadHome();
  }, []);

  const isBookmarked = useMemo(
    () => (url) => bookmarks.some((item) => item.url === url),
    [bookmarks]
  );

  async function loadHome() {
    setLoading(true);
    try {
      const entries = await Promise.all(HOME_CATEGORIES.map(async (cat) => {
        if (cat.query) {
          const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(cat.query)}`);
          const data = await res.json();
          return [cat.key, Array.isArray(data) ? data.slice(0, 12) : []];
        }
        const res = await fetch(`${API_BASE}/latest`);
        const data = await res.json();
        return [cat.key, Array.isArray(data) ? data.slice(0, 12) : []];
      }));
      setSections(Object.fromEntries(entries));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function submitSearch(forceQuery) {
    const q = (forceQuery || search).trim();
    if (!q) return;
    setTab('explore');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResult(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(url) {
    setLoading(true);
    setTab('detail');
    try {
      const res = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }

  async function openWatch(ep) {
    if (!ep?.link) return;
    setLoading(true);
    setTab('watch');
    try {
      const res = await fetch(`${API_BASE}/watch?url=${encodeURIComponent(ep.link)}`);
      const data = await res.json();
      const streams = (data?.streams || []).filter((item) => item.url);
      setWatch({ episode: ep, streams, current: streams[0]?.url || null });
      setHistory((prev) => [{
        title: detail.title,
        image: detail.image,
        episode: ep.episode || ep.title,
        url: ep.link,
        time: new Date().toISOString()
      }, ...prev.filter((h) => h.url !== ep.link)].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  function toggleBookmark(anime) {
    if (!anime?.url) return;
    setBookmarks((prev) => {
      if (prev.some((item) => item.url === anime.url)) {
        return prev.filter((item) => item.url !== anime.url);
      }
      return [{ title: anime.title, image: anime.image, url: anime.url }, ...prev];
    });
  }

  function renderCard(item) {
    return (
      <article className="anime-card" key={item.link || item.url || item.title} onClick={() => openDetail(item.link || item.url)}>
        <img src={item.image || PROFILE_IMAGE} alt={item.title} loading="lazy" />
        <div className="meta">
          <h4>{item.title}</h4>
          <span>{item.type || item.status || item.episode || 'Anime'}</span>
        </div>
      </article>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>WatchNime Next</h1>
          <p>React Edition • Vercel Ready</p>
        </div>
        <img className="avatar" src={PROFILE_IMAGE} alt="profile" />
      </header>

      <section className="search-box">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari anime favorit..."
          onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
        />
        <button onClick={() => submitSearch()}>Cari</button>
      </section>

      {loading && <div className="loader">Memuat data...</div>}

      {!loading && tab === 'home' && (
        <main className="view-stack">
          {history.length > 0 && (
            <section>
              <div className="section-head"><h3>Continue Watching</h3></div>
              <div className="scroller">{history.slice(0, 8).map((h) => (
                <div className="history-card" key={h.url} onClick={() => openDetail(h.url)}>
                  <img src={h.image || PROFILE_IMAGE} alt={h.title} />
                  <div>
                    <strong>{h.title}</strong>
                    <small>Episode {h.episode}</small>
                  </div>
                </div>
              ))}</div>
            </section>
          )}

          {HOME_CATEGORIES.map((cat) => (
            <section key={cat.key}>
              <div className="section-head">
                <h3>{cat.title}</h3>
                <button onClick={() => cat.query ? submitSearch(cat.query) : submitSearch('ongoing anime')}>Lihat semua</button>
              </div>
              <div className="grid-cards">{(sections[cat.key] || []).map(renderCard)}</div>
            </section>
          ))}
        </main>
      )}

      {!loading && tab === 'explore' && (
        <main className="view-stack">
          <section className="chips">
            {['Isekai', 'Action', 'Comedy', 'Romance', 'Adventure', 'Shounen', 'Fantasy', 'Drama'].map((g) => (
              <button key={g} onClick={() => submitSearch(g)}>{g}</button>
            ))}
          </section>
          <section>
            <div className="section-head"><h3>Hasil Pencarian</h3></div>
            <div className="grid-cards">{searchResult.map(renderCard)}</div>
          </section>
        </main>
      )}

      {!loading && tab === 'schedule' && (
        <main className="view-stack schedule-grid">
          {activeSchedule.map((row) => (
            <article key={row.day} className="schedule-card">
              <h3>{row.day}</h3>
              {row.genres.map((genre) => <button key={genre} onClick={() => submitSearch(genre)}>{genre}</button>)}
            </article>
          ))}
        </main>
      )}

      {!loading && tab === 'bookmarks' && (
        <main className="view-stack">
          <section>
            <div className="section-head"><h3>Bookmark Saya</h3></div>
            {bookmarks.length === 0 ? <p className="empty">Belum ada bookmark.</p> : <div className="grid-cards">{bookmarks.map(renderCard)}</div>}
          </section>
        </main>
      )}

      {!loading && tab === 'profile' && (
        <main className="profile view-stack">
          <img className="big-avatar" src={PROFILE_IMAGE} alt="profile" />
          <h2>R_hmt ofc</h2>
          <p className="tag">Developer & Admin</p>
          <div className="profile-panels">
            <div className="panel"><strong>Total Bookmark</strong><span>{bookmarks.length}</span></div>
            <div className="panel"><strong>Riwayat Tontonan</strong><span>{history.length}</span></div>
            <div className="panel"><strong>Status</strong><span>Online</span></div>
          </div>
          <button className="danger" onClick={() => {
            localStorage.clear();
            setBookmarks([]);
            setHistory([]);
          }}>Reset Cache</button>
        </main>
      )}

      {!loading && tab === 'detail' && detail && (
        <main className="detail view-stack">
          <button className="back" onClick={() => setTab('home')}>← Kembali</button>
          <section className="detail-head">
            <img src={detail.image || PROFILE_IMAGE} alt={detail.title} />
            <div>
              <h2>{detail.title}</h2>
              <p>{detail.synopsis || 'Sinopsis belum tersedia.'}</p>
              <div className="actions">
                <button onClick={() => toggleBookmark({ title: detail.title, image: detail.image, url: detail.url })}>
                  {isBookmarked(detail.url) ? 'Hapus Bookmark' : 'Simpan Bookmark'}
                </button>
              </div>
            </div>
          </section>
          <section>
            <div className="section-head"><h3>Episode</h3></div>
            <div className="episode-grid">
              {detail.episodes?.map((ep) => <button key={ep.link} onClick={() => openWatch(ep)}>{ep.episode || ep.title}</button>)}
            </div>
          </section>
        </main>
      )}

      {!loading && tab === 'watch' && watch && (
        <main className="watch view-stack">
          <button className="back" onClick={() => setTab('detail')}>← Kembali ke Detail</button>
          <div className="player-wrap">
            <iframe src={watch.current || ''} title="video-player" allowFullScreen />
          </div>
          <h3>{detail?.title} • {watch.episode?.episode || watch.episode?.title}</h3>
          <div className="chips">
            {watch.streams.map((stream) => (
              <button key={stream.server + stream.url} onClick={() => setWatch((prev) => ({ ...prev, current: stream.url }))}>
                {stream.server}
              </button>
            ))}
          </div>
        </main>
      )}

      <nav className="bottom-nav">
        {[
          ['home', 'Home'],
          ['explore', 'Explore'],
          ['schedule', 'Jadwal'],
          ['bookmarks', 'Bookmark'],
          ['profile', 'Profile']
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
