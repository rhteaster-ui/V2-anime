const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());

class Animekuindo {
  constructor() {
    this.baseUrl = 'https://s2.animekuindo.life';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: this.baseUrl,
      'Upgrade-Insecure-Requests': '1',
      'Sec-Ch-Ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Linux"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1'
    };
  }

  generateCookies() {
    const timestamp = Date.now();
    const random1 = crypto.randomBytes(4).readUInt32BE(0);
    const random2 = crypto.randomBytes(4).readUInt32BE(0);

    return `g_state={"i_l":0,"i_ll":${timestamp + 86400000},"i_b":"${crypto.randomBytes(32).toString('base64')}","i_e":{"enable_itp_optimization":0}}; _ga_JC7F2NZVN8=GS2.1.s${Math.floor(timestamp / 1000)}$o1$g0$t${Math.floor(timestamp / 1000)}$j60$l0$h0; _ga=GA1.1.${random1}.${Math.floor(timestamp / 1000)}; HstCfa4980656=${timestamp}; HstCla4980656=${timestamp}; HstCmu4980656=${timestamp}; HstPn4980656=1; HstPt4980656=1; HstCnv4980656=1; HstCns4980656=1; _gcl_au=1.1.${random2}.${Math.floor(timestamp / 1000)}; __dtsu=${crypto.randomBytes(16).toString('hex')}; _pubcid=${crypto.randomUUID()}; _cc_id=${crypto.randomBytes(16).toString('hex')}`;
  }

  async fetchPage(url) {
    const response = await axios.get(url, {
      headers: {
        ...this.headers,
        Cookie: this.generateCookies()
      },
      timeout: 30000,
      family: 4
    });
    return cheerio.load(response.data);
  }

  async latestAnime(page = 1) {
    const $ = await this.fetchPage(`${this.baseUrl}/page/${page}/`);
    const results = [];

    $('.listupd .bs').each((_, el) => {
      const link = $(el).find('.bsx a').attr('href');
      const title = $(el).find('.tt h2').text().trim();
      const image = $(el).find('img').attr('src');
      const status = $(el).find('.status').text().trim();
      const type = $(el).find('.typez').text().trim();
      const episode = $(el).find('.epx').text().trim() || null;

      if (link && title) {
        results.push({ title, link, image: image || null, status: status || null, type: type || null, episode });
      }
    });

    return results;
  }

  async searchAnime(keyword) {
    const $ = await this.fetchPage(`${this.baseUrl}/?s=${encodeURIComponent(keyword)}`);
    const results = [];

    $('.listupd .bs').each((_, el) => {
      const link = $(el).find('.bsx a').attr('href');
      const title = $(el).find('.tt h2').text().trim();
      const image = $(el).find('img').attr('src');
      const status = $(el).find('.status').text().trim();
      const type = $(el).find('.typez').text().trim();

      if (title && link) {
        results.push({ title, link, image: image || null, status: status || null, type: type || null });
      }
    });

    return { keyword, totalResults: results.length, results };
  }

  async getEpisodeStream(episodeUrl) {
    const $ = await this.fetchPage(episodeUrl);
    const streamUrl = $('#pembed iframe').attr('src') || null;
    const mirrorStreams = [];

    $('.mirrorstream ul li a').each((_, el) => {
      const provider = $(el).text().trim();
      const dataContent = $(el).attr('data-content');
      if (provider && dataContent) {
        mirrorStreams.push({ provider, dataContent });
      }
    });

    return { streamUrl, mirrorStreams };
  }

  async getAnimeDetail(url, includeStream = false) {
    const $ = await this.fetchPage(url);

    const title = $('h1.entry-title').text().trim();
    const image = $('.thumbook .thumb img').attr('src') || null;

    const info = {};
    $('.info-content .spe span').each((_, el) => {
      const text = $(el).text().trim();
      const colonIndex = text.indexOf(':');
      if (colonIndex > 0) {
        const key = text.substring(0, colonIndex).trim();
        const value = text.substring(colonIndex + 1).trim();
        info[key] = value;
      }
    });

    const genres = $('.genxed a').map((_, el) => $(el).text().trim()).get();
    const synopsis = $('.entry-content p').map((_, el) => $(el).text().trim()).get().join(' ');
    const ratingText = $('.rating strong').text().trim().replace('Rating', '').trim();
    const ratingMatch = ratingText.match(/(\d+\.\d+)/);

    const episodes = [];
    const episodeItems = $('.eplister ul li').toArray();

    for (const el of episodeItems) {
      const episodeLink = $(el).find('a').attr('href');
      const episodeNum = $(el).find('.epl-num').text().trim();
      const episodeTitle = $(el).find('.epl-title').text().trim();
      const episodeDate = $(el).find('.epl-date').text().trim();

      let stream = null;
      if (includeStream && episodeLink) {
        stream = await this.getEpisodeStream(episodeLink);
      }

      episodes.push({
        episode: episodeNum,
        title: episodeTitle,
        link: episodeLink,
        date: episodeDate,
        stream
      });
    }

    return {
      title,
      image,
      info,
      genres,
      synopsis,
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
      totalEpisodes: episodes.length,
      episodes: episodes.reverse(),
      url
    };
  }
}

const scraper = new Animekuindo();

app.get('/api/health', (_, res) => {
  res.json({ ok: true, source: 'animekuindo', timestamp: new Date().toISOString() });
});

app.get('/api/latest', async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const data = await scraper.latestAnime(page);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Missing query: q' });
    const data = await scraper.searchAnime(q);
    res.json(data.results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/detail', async (req, res) => {
  try {
    const { url } = req.query;
    const includeStream = req.query.includeStream === 'true';
    if (!url) return res.status(400).json({ error: 'Missing query: url' });
    const data = await scraper.getAnimeDetail(url, includeStream);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/watch', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing query: url' });
    const streamData = await scraper.getEpisodeStream(url);
    const streams = [];

    if (streamData.streamUrl) {
      streams.push({ server: 'Default', url: streamData.streamUrl });
    }

    streamData.mirrorStreams.forEach((item) => {
      streams.push({ server: item.provider, url: item.dataContent });
    });

    res.json({ streams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
