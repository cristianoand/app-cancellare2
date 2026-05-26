import { useEffect, useMemo, useState } from 'react';

const parseYouTubeId = (url) => {
  if (!url) return '';
  const clean = url.trim();
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /v=([\w-]{11})/,
    /embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/
  ];
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[1];
  }
  return '';
};

function App() {
  const [tracks, setTracks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState({
    addSong: false,
    search: false,
    playlist: false,
    video: false
  });

  const sectionOptions = [
    { key: 'addSong', label: 'Aggiungi canzone' },
    { key: 'search', label: 'Ricerca accordi' },
    { key: 'playlist', label: 'Playlist' },
    { key: 'video', label: 'Video embed' }
  ];

  const toggleSection = (key) => {
    setVisibleSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedSectionCount = Object.values(visibleSections).filter(Boolean).length;

  useEffect(() => {
    fetch('/api/tracks')
      .then((res) => res.json())
      .then((data) => {
        setTracks(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch(() => setError('Impossibile caricare le canzoni.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedId) || tracks[0] || null,
    [tracks, selectedId]
  );

  const embedUrl = selectedTrack ? `https://www.youtube.com/embed/${parseYouTubeId(selectedTrack.youtube_url)}` : '';

  const refreshTracks = async () => {
    const res = await fetch('/api/tracks');
    if (!res.ok) throw new Error('Errore');
    const data = await res.json();
    setTracks(data);
    setSelectedId(data[0]?.id ?? null);
  };

  const handleAdd = async () => {
    setError('');
    if (!title.trim() || !youtubeUrl.trim()) {
      setError('Inserisci titolo e link YouTube.');
      return;
    }
    try {
      const res = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), youtube_url: youtubeUrl.trim() })
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Errore aggiunta.');
      }
      await refreshTracks();
      setTitle('');
      setYoutubeUrl('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id, updatedTitle, updatedUrl) => {
    setError('');
    try {
      const res = await fetch(`/api/tracks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: updatedTitle, youtube_url: updatedUrl })
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Errore aggiornamento.');
      }
      await refreshTracks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
    await refreshTracks();
  };

  const moveTrack = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tracks.length) return;
    const reordered = [...tracks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);

    const order = reordered.map((track) => track.id);
    const res = await fetch('/api/tracks/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Impossibile riordinare.');
      return;
    }
    const data = await res.json();
    setTracks(data);
  };

  const ultimateGuitarLink = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(searchText)}`;

  return (
    <div className="app-shell">
      <header>
        <div className="header-inner">
          <div>
            <h1>Song Study App</h1>
            <p>Gestisci link YouTube, modifica l'ordine delle canzoni e cerca accordi su Ultimate Guitar.</p>
          </div>
          <div className="menu-container">
            <button
              type="button"
              className={`menu-trigger ${menuOpen ? 'open' : ''}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {menuOpen && (
              <div className="menu-dropdown">
                <p className="menu-label">Mostra sezioni</p>
                {sectionOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`menu-item ${visibleSections[option.key] ? 'active' : ''}`}
                    onClick={() => toggleSection(option.key)}
                  >
                    <span>{option.label}</span>
                    <span>{visibleSections[option.key] ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {!selectedSectionCount && (
        <div className="panel notice info">
          <p>Apri il menu a tre puntini e seleziona le sezioni da mostrare.</p>
        </div>
      )}

      {(visibleSections.addSong || visibleSections.search) && (
        <section className="grid-layout">
          {visibleSections.addSong && (
            <article className="panel">
              <h2>Aggiungi canzone</h2>
              <label>
                Titolo
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo canzone" />
              </label>
              <label>
                Link YouTube
                <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
              </label>
              <button onClick={handleAdd}>Aggiungi alla playlist</button>
              {error && <div className="notice error">{error}</div>}
            </article>
          )}

          {visibleSections.search && (
            <article className="panel">
              <h2>Ricerca accordi</h2>
              <label>
                Titolo o artista
                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Esempio: Hallelujah" />
              </label>
              <a className="primary-link" href={ultimateGuitarLink} target="_blank" rel="noreferrer">
                Cerca su Ultimate Guitar
              </a>
              <p>Apri il sito con il termine di ricerca per trovare testi e accordi.</p>
            </article>
          )}
        </section>
      )}

      {visibleSections.playlist && (
        <section className="panel">
          <h2>Playlist</h2>
          {loading ? (
            <p>Caricamento...</p>
          ) : tracks.length === 0 ? (
            <p>Nessuna canzone salvata.</p>
          ) : (
            <div className="track-list">
              {tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  selected={track.id === selectedTrack?.id}
                  onSelect={() => setSelectedId(track.id)}
                  onSave={handleUpdate}
                  onDelete={() => handleDelete(track.id)}
                  onMove={(dir) => moveTrack(index, dir)}
                  canMoveUp={index > 0}
                  canMoveDown={index < tracks.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {visibleSections.video && (
        <section className="panel video-panel">
          <h2>Video embed</h2>
          {selectedTrack ? (
          <>
            <div className="video-header">
              <h3>{selectedTrack.title}</h3>
              <a href={selectedTrack.youtube_url} target="_blank" rel="noreferrer">
                Apri su YouTube
              </a>
            </div>
            {embedUrl ? (
              <div className="iframe-wrapper">
                <iframe
                  title="Video YouTube"
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="notice error">Link YouTube non valido.</div>
            )}
          </>
        ) : (
          <p>Seleziona una canzone per vedere il video embed.</p>
        )}
      </section>
    </div>
  );
}

function TrackRow({ track, index, selected, onSelect, onSave, onDelete, onMove, canMoveUp, canMoveDown }) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(track.title);
  const [youtubeUrl, setYoutubeUrl] = useState(track.youtube_url);

  useEffect(() => {
    setTitle(track.title);
    setYoutubeUrl(track.youtube_url);
  }, [track.title, track.youtube_url]);

  return (
    <div className={`track-row ${selected ? 'selected' : ''}`}>
      <div className="track-main" onClick={onSelect}>
        {editMode ? (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
          </>
        ) : (
          <>
            <strong>{track.title}</strong>
            <span>{track.youtube_url}</span>
          </>
        )}
      </div>
      <div className="track-actions">
        <button type="button" onClick={() => onSelect()}>{selected ? 'Selezionata' : 'Apri'}</button>
        {editMode ? (
          <button type="button" onClick={() => { setEditMode(false); onSave(track.id, title.trim(), youtubeUrl.trim()); }}>
            Salva
          </button>
        ) : (
          <button type="button" onClick={() => setEditMode(true)}>Modifica</button>
        )}
        <button type="button" onClick={() => onDelete()}>Elimina</button>
        <button type="button" disabled={!canMoveUp} onClick={() => onMove(-1)}>↑</button>
        <button type="button" disabled={!canMoveDown} onClick={() => onMove(1)}>↓</button>
      </div>
    </div>
  );
}

export default App;
