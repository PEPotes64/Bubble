const express = require('express');
const path = require('path');
const axios = require('axios');
const fetch = require('isomorphic-unfetch');
const { getTracks } = require('spotify-url-info')(fetch);
const yts = require('yt-search');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return response.data.access_token;
}

app.post('/api/convertir-url', async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ exito: false, error: 'Poné una URL mano :v' });

    let tracks = [];

    // 1. Intentar con la API oficial de Spotify si hay credenciales
    if (CLIENT_ID && CLIENT_SECRET) {
      try {
        const match = url.match(/playlist\/([a-zA-Z0-9?=-]+)/);
        const cleanId = match ? match[1].split('?')[0] : null;
        if (cleanId) {
          const token = await getSpotifyToken();
          let urlApi = `https://api.spotify.com/v1/playlists/${cleanId}/tracks?limit=100`;
          while (urlApi) {
            const response = await axios.get(urlApi, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            response.data.items.forEach(item => {
              if (item.track) tracks.push(item.track);
            });
            urlApi = response.data.next;
          }
        }
      } catch (apiErr) {
        console.log('Facheó la API oficial, usando scraping de respaldo...', apiErr.message);
      }
    }

    // 2. Si falló la API o no hay llaves, usar scraping básico de respaldo
    if (!tracks || tracks.length === 0) {
      tracks = await getTracks(url);
    }

    if (!tracks || tracks.length === 0) {
      return res.status(404).json({ exito: false, error: 'No se encontraron rolas o la playlist es privada >:v' });
    }

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

    res.json({ exito: true, canciones, total: canciones.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ exito: false, error: 'Valió gorro al procesar la playlist :v' });
  }
});

app.post('/api/buscar-yt', async (req, res) => {
  try {
    const { query } = req.body;
    const r = await yts(query);
    const videos = r.videos;
    if (videos && videos.length > 0) {
      res.json({ videoId: videos[0].videoId });
    } else {
      res.status(404).json({ error: 'No se encontró en YouTube >:v' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Falló al buscar en YouTube >:v' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bubble Music corriendo en puerto ${PORT} Bv`));
