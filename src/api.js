const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function sendRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (response.status === 204) {
    return null
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'The server could not complete the request.')
  }

  return result
}

export async function getStories() {
  const result = await sendRequest('/api/stories')
  return result.stories
}

export async function getStory(storyId) {
  const result = await sendRequest(`/api/stories/${encodeURIComponent(storyId)}`)
  return result.story
}

export async function createStory(idea, genre) {
  const result = await sendRequest('/api/stories', {
    method: 'POST',
    body: JSON.stringify({ idea, genre }),
  })
  return result.story
}

export async function continueStory(storyId, choice) {
  const result = await sendRequest(`/api/stories/${encodeURIComponent(storyId)}/continue`, {
    method: 'POST',
    body: JSON.stringify({ choice }),
  })
  return result.story
}

export async function deleteStory(storyId) {
  await sendRequest(`/api/stories/${encodeURIComponent(storyId)}`, {
    method: 'DELETE',
  })
}
