import React, { useState } from 'react';
import { Search, Info, Loader2 } from 'lucide-react';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [infoId, setInfoId] = useState('');
  const [infoResult, setInfoResult] = useState<any>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [episodesId, setEpisodesId] = useState('');
  const [episodesSeason, setEpisodesSeason] = useState('');
  const [episodesResult, setEpisodesResult] = useState<any>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  const [streamId, setStreamId] = useState('');
  const [streamResult, setStreamResult] = useState<any>(null);
  const [streamLoading, setStreamLoading] = useState(false);

  const [listEndpoint, setListEndpoint] = useState('series');
  const [listResult, setListResult] = useState<any>(null);
  const [listLoading, setListLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const res = await fetch(`/api/anime/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResult(data);
    } catch (error) {
      setSearchResult({ error: 'Failed to fetch' });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoId) return;
    
    setInfoLoading(true);
    setInfoResult(null);
    try {
      const res = await fetch(`/api/anime/info?id=${encodeURIComponent(infoId)}`);
      const data = await res.json();
      setInfoResult(data);
    } catch (error) {
      setInfoResult({ error: 'Failed to fetch' });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleEpisodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodesId || !episodesSeason) return;
    
    setEpisodesLoading(true);
    setEpisodesResult(null);
    try {
      const res = await fetch(`/api/anime/episodes?id=${encodeURIComponent(episodesId)}&season=${encodeURIComponent(episodesSeason)}`);
      const data = await res.json();
      setEpisodesResult(data);
    } catch (error) {
      setEpisodesResult({ error: 'Failed to fetch' });
    } finally {
      setEpisodesLoading(false);
    }
  };

  const handleStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamId) return;
    
    setStreamLoading(true);
    setStreamResult(null);
    try {
      const res = await fetch(`/api/anime/stream?id=${encodeURIComponent(streamId)}`);
      const data = await res.json();
      setStreamResult(data);
    } catch (error) {
      setStreamResult({ error: 'Failed to fetch' });
    } finally {
      setStreamLoading(false);
    }
  };

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault();
    setListLoading(true);
    setListResult(null);
    try {
      const res = await fetch(`/api/anime/${listEndpoint}`);
      const data = await res.json();
      setListResult(data);
    } catch (error) {
      setListResult({ error: 'Failed to fetch' });
    } finally {
      setListLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AnimeSalt API Tester</h1>
          <p className="text-zinc-400">Test the RESTful endpoints for searching and getting anime info.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Search Endpoint */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              Search Endpoint
            </h2>
            <div className="mb-4 bg-black/50 p-3 rounded-lg font-mono text-sm text-zinc-300 border border-zinc-800">
              GET /api/anime/search?q=&#123;keyword&#125;
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., naruto"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={searchLoading || !searchQuery}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </form>

            <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-96 flex flex-col">
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Response JSON
              </div>
              <div className="p-4 overflow-auto flex-1">
                {searchResult ? (
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(searchResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    No data yet. Run a test.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Info Endpoint */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              Info Endpoint
            </h2>
            <div className="mb-4 bg-black/50 p-3 rounded-lg font-mono text-sm text-zinc-300 border border-zinc-800">
              GET /api/anime/info?id=&#123;anime_id&#125;
            </div>
            
            <form onSubmit={handleInfo} className="flex gap-2 mb-6">
              <input
                type="text"
                value={infoId}
                onChange={(e) => setInfoId(e.target.value)}
                placeholder="e.g., naruto-shippuden"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={infoLoading || !infoId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {infoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </form>

            <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-96 flex flex-col">
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Response JSON
              </div>
              <div className="p-4 overflow-auto flex-1">
                {infoResult ? (
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(infoResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    No data yet. Run a test.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Episodes Endpoint */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              Episodes Endpoint
            </h2>
            <div className="mb-4 bg-black/50 p-3 rounded-lg font-mono text-sm text-zinc-300 border border-zinc-800">
              GET /api/anime/episodes?id=&#123;anime_id&#125;&season=&#123;num&#125;
            </div>
            
            <form onSubmit={handleEpisodes} className="flex gap-2 mb-6">
              <input
                type="text"
                value={episodesId}
                onChange={(e) => setEpisodesId(e.target.value)}
                placeholder="e.g., naruto-shippuden"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <input
                type="number"
                value={episodesSeason}
                onChange={(e) => setEpisodesSeason(e.target.value)}
                placeholder="Season (e.g., 1)"
                className="w-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={episodesLoading || !episodesId || !episodesSeason}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {episodesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </form>

            <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-96 flex flex-col">
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Response JSON
              </div>
              <div className="p-4 overflow-auto flex-1">
                {episodesResult ? (
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(episodesResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    No data yet. Run a test.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Stream Endpoint */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              Stream Endpoint
            </h2>
            <div className="mb-4 bg-black/50 p-3 rounded-lg font-mono text-sm text-zinc-300 border border-zinc-800">
              GET /api/anime/stream?id=&#123;ep_or_anime_id&#125;
            </div>
            
            <form onSubmit={handleStream} className="flex gap-2 mb-6">
              <input
                type="text"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="e.g., naruto-shippuden-1x1 or your-name"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="submit"
                disabled={streamLoading || !streamId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {streamLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </form>

            <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-96 flex flex-col">
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Response JSON
              </div>
              <div className="p-4 overflow-auto flex-1">
                {streamResult ? (
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(streamResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    No data yet. Run a test.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* List Endpoints */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm md:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" />
              List Endpoints
            </h2>
            <div className="mb-4 bg-black/50 p-3 rounded-lg font-mono text-sm text-zinc-300 border border-zinc-800">
              GET /api/anime/&#123;endpoint&#125;
            </div>
            
            <form onSubmit={handleList} className="flex gap-2 mb-6">
              <select
                value={listEndpoint}
                onChange={(e) => setListEndpoint(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white"
              >
                <option value="series">Series (/api/anime/series)</option>
                <option value="movies">Movies (/api/anime/movies)</option>
                <option value="cartoon">Cartoon (/api/anime/cartoon)</option>
                <option value="hindidub">Hindi Dub (/api/anime/hindidub)</option>
                <option value="freshdrops">Fresh Drops (/api/anime/freshdrops)</option>
              </select>
              <button
                type="submit"
                disabled={listLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {listLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
              </button>
            </form>

            <div className="bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-96 flex flex-col">
              <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Response JSON
              </div>
              <div className="p-4 overflow-auto flex-1">
                {listResult ? (
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {JSON.stringify(listResult, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                    No data yet. Run a test.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

