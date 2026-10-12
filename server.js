const express = require('express');
const axios = require('axios');
const path = require('path');
const fetch = require('isomorphic-unfetch');
const { getTracks } = require('spotify-url-info')(fetch);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// 1. Extraer TODAS las rolas de la URL pública
app.post('/api/convertir-url', async (req, res) => {
  try {
    const { url } = req.body;
    const tracks = await getTracks(url);

    const canciones = tracks.map(track => {
      let artista = '';
      if (track.artists && track.artists.length > 0) {
        artista = typeof track.artists[0] === 'string' ? track.artists[0] : (track.artists[0].name || '');
      } else if (track.artist) {
        artista = track.artist;
      }

      const titulo = track.name || 'Canción desconocida';
      const query = artista ? `${titulo} ${artista}` : titulo;

      return { titulo, artista, query };
    });

    res.json({ exito: true, canciones });
  } catch (error) {
    res.status(500).json({ exito: false, error: 'Valió gorro al leer la playlist :v' });
  }
});

// 2. Buscar en YouTube con múltiples servidores públicos de respaldo
app.post('/api/buscar-yt', async (req, res) => {
  const { query } = req.body;
  
  // Lista de instancias públicas de Invidious / Piped
  const instancias = [
    'https://inv.hostux.net/api/v1/search',
    'https://invidious.nerdvpn.de/api/v1/search',
    'https://pipedapi.kavin.rocks/search'
  ];

  for (const apiURL of instancias) {
    try {
      const isPiped = apiURL.includes('piped');
      const params = isPiped ? { q: query, filter: 'videos' } : { q: query, type: 'video' };
      
      const ytRes = await axios.get(apiURL, { params, timeout: 3500 });

      if (ytRes.data && ytRes.data.length > 0) {
        const item = ytRes.data[0];
        const videoId = item.videoId || (item.url ? item.url.split('v=')[1] : null);
        if (videoId) return res.json({ videoId });
      } else if (ytRes.data && ytRes.data.items && ytRes.data.items.length > 0) {
        const item = ytRes.data.items[0];
        const videoId = item.url ? item.url.split('v=')[1] : null;
        if (videoId) return res.json({ videoId });
      }
    } catch (e) {
      continue; // Probar siguiente servidor
    }
  }

  res.status(500).json({ error: 'No se encontró la rola en YouTube >:v' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bubble Music corriendo en puerto ${PORT} Bv`));
