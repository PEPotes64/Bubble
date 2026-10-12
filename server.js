const express = require('express');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Obtener token de acceso de Spotify (Gratis)
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

// Extraer TODAS las rolas paginando la API oficial de Spotify
app.post('/api/convertir-url', async (req, res) => {
  try {
    let { url } = req.body;
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) return res.status(400).json({ exito: false, error: 'URL toda mela, revisala mano :v' });

    const playlistId = match[1];
    const token = await getSpotifyToken();

    let tracks = [];
    let urlApi = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

    // Ciclo para traer todas las páginas si pasan de 100 canciones
    while (urlApi) {
      const response = await axios.get(urlApi, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const items = response.data.items;
      items.forEach(item => {
        if (item.track) {
          tracks.push(item.track);
        }
      });

      urlApi = response.data.next; // Salta a la siguiente página automáticamente
    }

    const canciones = tracks.map(track => {
      let artista = track.artists && track.artists.length > 0 ? track.artists[0].name : '';
      const titulo = track.name || 'Cancion desconocida';
      const query = artista ? `${titulo} ${artista}` : titulo;
      return { titulo, artista, query };
    });

    res.json({ exito: true, canciones, total: canciones.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ exito: false, error: 'Valio gorro al traer todas las rolas con la API :v' });
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
      res.status(404).json({ error: 'No se encontro en youtube >:v' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Fallo al buscar en youtube >:v' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bubble Music corriendo en puerto ${PORT} Bv`));
