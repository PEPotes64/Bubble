const express = require('express');
const path = require('path');
const fetch = require('isomorphic-unfetch');
const { getTracks } = require('spotify-url-info')(fetch);
const yts = require('yt-search');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Extraer rolas de la playlist
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
      const titulo = track.name || 'Cancion desconocida';
      const query = artista ? `${titulo} ${artista}` : titulo;
      return { titulo, artista, query };
    });

    res.json({ exito: true, canciones });
  } catch (error) {
    res.status(500).json({ exito: false, error: 'Valio gorro al leer la playlist :v' });
  }
});

// Buscar en YouTube con yt-search (100% estable sin API Key)
app.post('/api/buscar-yt', async (req, res) => {
  try {
    const { query } = req.body;
    const r = await yts(query);
    const videos = r.videos;
    
    if (videos && videos.length > 0) {
      res.json({ videoId: videos[0].videoId });
    } else {
      res.status(404).json({ error: 'No se encontro en youtube >:v' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Fallo al buscar en youtube >:v' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🫧Bubble Music🫧 corriendo en puerto ${PORT} Bv`));
