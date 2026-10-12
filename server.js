const express = require('express');
const axios = require('axios');
const path = require('path');
const fetch = require('isomorphic-unfetch');
const { getDetails, getTracks } = require('spotify-url-info')(fetch);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// 1. Extraer rolas con artistas garantizados
app.post('/api/convertir-url', async (req, res) => {
  try {
    const { url } = req.body;
    const tracks = await getTracks(url);

    const canciones = tracks.map(track => {
      // Extraer artistas correctamente sin importar la estructura
      let artista = '';
      if (track.artists && track.artists.length > 0) {
        artista = typeof track.artists[0] === 'string' ? track.artists[0] : (track.artists[0].name || '');
      } else if (track.artist) {
        artista = track.artist;
      }

      const titulo = track.name || 'Canción desconocida';
      const query = artista ? `${titulo} ${artista}` : titulo;

      return {
        titulo,
        artista,
        query
      };
    });

    res.json({ exito: true, canciones });
  } catch (error) {
    console.error(error);
    res.status(500).json({ exito: false, error: 'Valió gorro al leer la playlist :v' });
  }
});

// 2. Buscar en YouTube con fallback de servidores
app.post('/api/buscar-yt', async (req, res) => {
  const { query } = req.body;
  
  // Lista de servidores de respaldo por si uno anda de mulo
  const instancias = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://pipedapi.tokhmi.xyz'
  ];

  for (const instancia of instancias) {
    try {
      const ytRes = await axios.get(`${instancia}/search`, {
        params: { q: query, filter: 'videos' },
        timeout: 4000
      });

      if (ytRes.data && ytRes.data.items && ytRes.data.items.length > 0) {
        const item = ytRes.data.items[0];
        const videoId = item.url ? item.url.split('v=')[1] : null;
        if (videoId) {
          return res.json({ videoId });
        }
      }
    } catch (e) {
      // Si falla uno, prueba con el siguiente servidor automáticamente
      continue;
    }
  }

  res.status(500).json({ error: 'No se encontró la rola en YouTube >:v' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bubble Music corriendo en puerto ${PORT} Bv`));
