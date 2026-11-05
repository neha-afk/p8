import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'missing-api-key' })
const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey)
  : null

function supabaseIsConfigured() {
  return Boolean(
    supabase &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseSecretKey.startsWith('replace_'),
  )
}

function sendDatabaseError(res, error) {
  console.error('Supabase request failed:', error.message)
  return res.status(500).json({ error: 'Could not complete the database request.' })
}

// Convert database column names to the story shape returned by the API.
function toApiStory(row) {
  const content = row.content || {}
  return {
    id: row.id,
    title: row.title,
    idea: row.theme,
    theme: row.theme,
    genre: row.genre,
    passages: content.passages || [],
    choices: content.choices || [],
    summary: row.summary,
    finished: row.is_finished,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Ask Groq for one story passage and its next choices as predictable JSON.
async function askGroq(prompt) {
  const response = await groq.chat.completions.create({
    model: groqModel,
    messages: [
      {
        role: 'system',
        content: 'You are an interactive story writer. Follow the user request and return only the requested JSON fields.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'story_part',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            passage: { type: 'string' },
            choices: { type: 'array', items: { type: 'string' } },
            finished: { type: 'boolean' },
          },
          required: ['passage', 'choices', 'finished'],
          additionalProperties: false,
        },
      },
    },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Groq returned an empty response.')
  }

  const storyPart = JSON.parse(content)
  if (
    typeof storyPart.passage !== 'string' ||
    !Array.isArray(storyPart.choices) ||
    typeof storyPart.finished !== 'boolean'
  ) {
    throw new Error('Groq returned an unexpected story format.')
  }

  storyPart.choices = storyPart.finished ? [] : storyPart.choices.slice(0, 3)
  if (!storyPart.finished && storyPart.choices.length < 2) {
    throw new Error('Groq returned fewer than two choices.')
  }

  return storyPart
}

async function generateStoryPart(prompt) {
  try {
    return await askGroq(prompt)
  } catch (error) {
    error.isGroqError = true
    throw error
  }
}

function groqIsConfigured() {
  return process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith('replace_')
}

function sendGroqError(res, error) {
  console.error('Groq story generation failed:', error.message)
  return res.status(502).json({ error: 'Story generation failed. Check the Groq API key and model.' })
}

// Let the Vite frontend (usually localhost:5173) make requests to this server.
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))

// Read JSON request bodies and make their values available as req.body.
app.use(express.json())

// POST /api/stories: create a story from { idea, genre }.
app.post('/api/stories', async (req, res) => {
  const { idea, genre } = req.body

  if (typeof idea !== 'string' || !idea.trim() || typeof genre !== 'string' || !genre.trim()) {
    return res.status(400).json({ error: 'Please provide both idea and genre.' })
  }

  if (!groqIsConfigured()) {
    return res.status(503).json({ error: 'Add your Groq API key to .env before creating stories.' })
  }
  if (!supabaseIsConfigured()) {
    return res.status(503).json({ error: 'Add your Supabase URL and server key to .env before saving stories.' })
  }

  try {
    const storyPart = await generateStoryPart(
      `Create the opening passage for an interactive ${genre.trim()} story based on this idea: ${idea.trim()}\n\nWrite one engaging opening passage. The passage must contain narrative prose only; do not include choices, a choices heading, or a list in the passage. Put exactly three short choices that lead to different next events in the separate choices field. Set finished to false. Keep all content suitable for a college storytelling project.`,
    )

    const passages = [storyPart.passage]
    const { data, error } = await supabase
      .from('stories')
      .insert({
        title: idea.trim().split(/[.!?]/)[0].slice(0, 44) || 'A New Beginning',
        theme: idea.trim(),
        genre: genre.trim(),
        content: { passages, choices: storyPart.choices },
        summary: storyPart.passage.slice(0, 500),
        is_finished: storyPart.finished,
      })
      .select()
      .single()

    if (error) return sendDatabaseError(res, error)
    return res.status(201).json({ story: toApiStory(data) })
  } catch (error) {
    if (error.isGroqError) return sendGroqError(res, error)
    return sendDatabaseError(res, error)
  }
})

// POST /api/stories/:id/continue: add a passage based on { choice }.
app.post('/api/stories/:id/continue', async (req, res) => {
  const { choice } = req.body
  if (typeof choice !== 'string' || !choice.trim()) {
    return res.status(400).json({ error: 'Please provide a choice.' })
  }

  if (!groqIsConfigured()) {
    return res.status(503).json({ error: 'Add your Groq API key to .env before continuing stories.' })
  }
  if (!supabaseIsConfigured()) {
    return res.status(503).json({ error: 'Add your Supabase URL and server key to .env before continuing stories.' })
  }

  try {
    const { data: savedStory, error: readError } = await supabase
      .from('stories')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (readError) return sendDatabaseError(res, readError)
    if (!savedStory) return res.status(404).json({ error: 'Story not found.' })

    const story = toApiStory(savedStory)
    if (story.finished) {
      return res.status(400).json({ error: 'This story has already ended.' })
    }

    const storyContext = {
      idea: story.idea,
      genre: story.genre,
      previousPassages: story.passages,
      selectedChoice: choice.trim(),
    }
    const storyPart = await generateStoryPart(
      `Continue this interactive story using the selected choice. Keep every established character name unchanged, preserve the events and facts from the previous passages, maintain the genre, follow the selected choice, and avoid repeating earlier content. Write only the next passage, not a recap. Then provide exactly three short choices for the next turn unless this is a natural ending; for an ending set finished to true and choices to an empty array.\n\nStory context:\n${JSON.stringify(storyContext)}`,
    )

    const passages = [...story.passages, storyPart.passage]
    const { data, error } = await supabase
      .from('stories')
      .update({
        content: { passages, choices: storyPart.choices },
        summary: passages.join(' ').slice(0, 500),
        is_finished: storyPart.finished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) return sendDatabaseError(res, error)
    return res.json({ story: toApiStory(data) })
  } catch (error) {
    if (error.isGroqError) return sendGroqError(res, error)
    return sendDatabaseError(res, error)
  }
})

// GET /api/stories: return every saved story.
app.get('/api/stories', async (req, res) => {
  if (!supabaseIsConfigured()) {
    return res.status(503).json({ error: 'Add your Supabase URL and server key to .env before fetching stories.' })
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) return sendDatabaseError(res, error)
    return res.json({ stories: data.map(toApiStory) })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
})

// GET /api/stories/:id: return one story by its ID.
app.get('/api/stories/:id', async (req, res) => {
  if (!supabaseIsConfigured()) {
    return res.status(503).json({ error: 'Add your Supabase URL and server key to .env before fetching stories.' })
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) return sendDatabaseError(res, error)
    if (!data) return res.status(404).json({ error: 'Story not found.' })
    return res.json({ story: toApiStory(data) })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
})

// DELETE /api/stories/:id: remove one story by its ID.
app.delete('/api/stories/:id', async (req, res) => {
  if (!supabaseIsConfigured()) {
    return res.status(503).json({ error: 'Add your Supabase URL and server key to .env before deleting stories.' })
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .delete()
      .eq('id', req.params.id)
      .select('id')

    if (error) return sendDatabaseError(res, error)
    if (!data.length) return res.status(404).json({ error: 'Story not found.' })
    return res.status(204).send()
  } catch (error) {
    return sendDatabaseError(res, error)
  }
})

app.listen(port, () => {
  console.log(`StoryVerse API is running at http://localhost:${port}`)
})
