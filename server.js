const express = require('express');
const axios = require('axios');
const path = require('path');
const fetch = require('isomorphic-unfetch');
const { getTracks } = require('spotify-url-info')(fetch);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// 1. Extraer rolas directamente desde la URL pública de Spotify
app.post('/api/convertir-url', async (req, res) => {
  try {
    const { url } = req.body;
    const tracks = await getTracks(url);

    const canciones = tracks.map(track => ({
      titulo: track.name,
      artista: track.artists ? track.artists[0].name : '',
      query: `${track.name} ${track.artists ? track.artists[0].name : ''}`
    }));

    res.json({ exito: true, canciones });
  } catch (error) {
    res.status(500).json({ exito: false, error: 'Valió gorro la URL, revisá que sea pública :v' });
  }
});

// 2. Buscar en YouTube mediante Piped/Invidious (Gratis, SIN API Key ni tarjeta)
app.post('/api/buscar-yt', async (req, res) => {
  try {
    const { query } = req.body;
    const ytRes = await axios.get(`https://pipedapi.kavin.rocks/search`, {
      params: { q: query, filter: 'videos' }
    });

    // Jalamos el ID del primer resultado
    const item = ytRes.data.items[0];
    const videoId = item ? item.url.split('v=')[1] : null;

    res.json({ videoId });
  } catch (error) {
    res.status(500).json({ error: 'Fallo al buscar en YouTube >:v' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bubble Music corriendo en puerto ${PORT} Bv`));
      
