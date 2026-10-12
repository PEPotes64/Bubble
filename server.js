const express = require('express');
const path = require('path');
const fetch = require('isomorphic-unfetch');
const { getTracks } = require('spotify-url-info')(fetch);
const yts = require('yt-search');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Extraer TODAS las rolas posibles barriendo el embed completo
app.post('/api/convertir-url', async (req, res) => {
  try {
    let { url } = req.body;
    if (!url) return res.status(400).json({ exito: false, error: 'Poné una URL mano :v' });

    let tracks = [];
    
    // Intentar extraer con getTracks
    try {
      tracks = await getTracks(url);
    } catch (e) {
      console.log('Facheó el método 1, tirando del embed directo...');
    }

    // Si faltan rolas o falló, le caemos al JSON embebido de Spotify
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      const playlistId = match[1];
      const embedRes = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`);
      const html = await embedRes.text();
      
      const matchJson = html.match(/<script id="resource" type="application\/json">(.*?)<\/script>/);
      if (matchJson && matchJson[1]) {
        const data = JSON.parse(decodeURIComponent(matchJson[1]));
        if (data && data.tracks && data.tracks.length > tracks.length) {
          tracks = data.tracks;
        }
      }
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
    res.status(500).json({ exito: false, error: 'Valió gorro al leer la playlist completa :v' });
  }
});

// Buscar en YouTube con yt-search
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
