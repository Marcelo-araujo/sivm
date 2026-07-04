import 'dotenv/config';

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Chave não encontrada no .env');
    return;
  }
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log('Modelos disponíveis:');
    if (data.models) {
      data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
      console.log(data);
    }
  } catch (err) {
    console.error('Erro ao listar:', err);
  }
}

listModels();
