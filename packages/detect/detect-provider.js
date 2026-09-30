const CANDIDATES = [
  { name: 'LM Studio', url: 'http://localhost:1234' },
  { name: 'Ollama', url: 'http://localhost:11434' },
  { name: 'LM Studio (Docker host)', url: 'http://host.docker.internal:1234' },
  { name: 'Ollama (Docker host)', url: 'http://host.docker.internal:11434' }
]

const TIMEOUT_MS = 1000

/**
 * Fetches available models from a given provider.
 * Returns an array of model ID strings, or an empty array on failure.
 */
export async function fetchModels (serverUrl, endpoint = '/v1/models', mapModels = (data) => data?.data?.map((model) => model.id)) {
  try {
    const res = await fetch(`${serverUrl.replace(/\/+$/, '')}${endpoint}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!res.ok) return []
    const data = await res.json()
    const models = mapModels(data)
    if (Array.isArray(models)) return models
  } catch {
    // Not reachable
  }
  return []
}

/**
 * Probes known local LLM providers sequentially and returns the first one
 * that responds to GET /v1/models, or null if none are found.
 * Also fetches available models and picks the first one as primaryModel.
 */
export async function detectProvider () {
  for (const candidate of CANDIDATES) {
    const isOllama = candidate.name.startsWith('Ollama')
    const models = await fetchModels(
      candidate.url,
      isOllama ? '/api/tags' : '/v1/models',
      isOllama
        ? (data) => data?.models?.map((model) => model.name)
        : (data) => data?.data?.map((model) => model.id)
    )
    if (models.length > 0) {
      return {
        name: candidate.name,
        url: candidate.url,
        model: models[0]
      }
    }
  }
  return null
}
