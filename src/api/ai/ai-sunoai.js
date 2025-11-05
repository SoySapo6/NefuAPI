const axios = require('axios');

module.exports = function(app) {

    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    async function sunoAIMusic(prompt, tags = 'pop, romantic, cumbia, reggaeton') {
        if (!prompt) throw new Error('Prompt is required');

        try {
            const { data: lyricApiRes } = await axios.get('https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat', {
                params: {
                    query: JSON.stringify([
                        {
                            role: 'system',
                            content: 'Eres una IA letrista profesional entrenada para escribir letras de canciones poéticas y rítmicas en español. Responde únicamente con letras, usando las etiquetas [verse], [chorus], [bridge] e [instrumental] para estructurar la canción. Usa solo la etiqueta (por ejemplo, [verse]) sin números ni texto adicional. No agregues explicaciones ni comentarios. Responde en texto limpio, exactamente como si fuera una hoja de letras de canción.'
                        },
                        { role: 'user', content: prompt }
                    ]),
                    link: 'writecream.com'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://writecream.com/'
                }
            });

            const generatedLyrics = lyricApiRes.response_content;
            if (!generatedLyrics) throw new Error('Error al generar letras de la canción');

            const session_hash = Math.random().toString(36).substring(2);
            await axios.post(`https://ace-step-ace-step.hf.space/gradio_api/queue/join?`, {
                data: [
                    240,
                    tags,
                    generatedLyrics,
                    60, 15, 'euler', 'apg', 10, '',
                    0.5, 0, 3, true, false, true, '', 0, 0,
                    false, 0.5, null, 'none'
                ],
                event_data: null,
                fn_index: 11,
                trigger_id: 45,
                session_hash
            });

            let resultMusicUrl;
            let pollingAttempts = 0;
            const maxPollingAttempts = 120;
            const pollingInterval = 1000;

            while (!resultMusicUrl && pollingAttempts < maxPollingAttempts) {
                const { data } = await axios.get(`https://ace-step-ace-step.hf.space/gradio_api/queue/data?session_hash=${session_hash}`);
                const lines = data.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const d = JSON.parse(line.substring(6));
                        if (d.msg === 'process_completed' && d.output?.data?.[0]?.url) {
                            resultMusicUrl = d.output.data[0].url;
                            break;
                        } else if (d.msg === 'queue_full' || d.msg === 'process_failed') {
                            throw new Error(`Error en HF Space: ${d.msg}`);
                        }
                    }
                }
                if (!resultMusicUrl) {
                    pollingAttempts++;
                    await delay(pollingInterval);
                }
            }

            if (!resultMusicUrl) throw new Error('Timeout: No se generó música AI.');
            return { url: resultMusicUrl, lyrics: generatedLyrics };

        } catch (error) {
            console.error('Error en sunoAIMusic:', error.message);
            throw new Error(`Fallo al crear música AI: ${error.message}`);
        }
    }

    app.get('/ai/sunoai', async (req, res) => {
        try {
            const { prompt, tags } = req.query;

            if (!prompt) {
                return res.status(400).json({ 
                    status: false, 
                    error: 'Prompt is required' 
                });
            }

            const { url, lyrics } = await sunoAIMusic(prompt, tags || 'pop, romantic');

            res.status(200).json({
                status: true,
                result: {
                    prompt,
                    tags: tags || 'pop, romantic',
                    lyrics,
                    music_url: url
                }
            });

        } catch (error) {
            res.status(500).json({ 
                status: false, 
                error: error.message 
            });
        }
    });

};
