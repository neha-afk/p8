import { useEffect, useState } from 'react'
import { continueStory as continueStoryRequest, createStory as createStoryRequest, deleteStory as deleteStoryRequest, getStories, getStory } from './api.js'
import { genres } from './data/sampleStories.js'

const navItems = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'create', label: 'Create story', icon: '＋' },
  { id: 'stories', label: 'My stories', icon: '▤' },
]

function App() {
  const [activePage, setActivePage] = useState('home')
  const [stories, setStories] = useState([])
  const [currentStory, setCurrentStory] = useState(null)
  const [isLoadingStories, setIsLoadingStories] = useState(true)
  const [isOpeningStory, setIsOpeningStory] = useState(false)
  const [isCreatingStory, setIsCreatingStory] = useState(false)
  const [isContinuingStory, setIsContinuingStory] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getStories()
      .then((savedStories) => {
        if (isMounted) setStories(savedStories)
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error.message)
      })
      .finally(() => {
        if (isMounted) setIsLoadingStories(false)
      })

    return () => { isMounted = false }
  }, [])

  async function openStory(storyId) {
    setIsOpeningStory(true)
    setErrorMessage('')
    try {
      const savedStory = await getStory(storyId)
      setCurrentStory(savedStory)
      setActivePage('reader')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsOpeningStory(false)
    }
  }

  async function createStory(idea, genre) {
    setIsCreatingStory(true)
    setErrorMessage('')
    try {
      const newStory = await createStoryRequest(idea, genre)
      setStories((savedStories) => [newStory, ...savedStories])
      setCurrentStory(newStory)
      setActivePage('reader')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsCreatingStory(false)
    }
  }

  async function chooseStory(choice) {
    if (!currentStory) return
    setIsContinuingStory(true)
    setErrorMessage('')
    try {
      const updatedStory = await continueStoryRequest(currentStory.id, choice)
      setCurrentStory(updatedStory)
      setStories((savedStories) => savedStories.map((story) => story.id === updatedStory.id ? updatedStory : story))
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsContinuingStory(false)
    }
  }

  async function finishStory() {
    await chooseStory('Guide the story toward a satisfying conclusion and end it now.')
  }

  async function removeStory(storyId) {
    if (!window.confirm('Delete this story? This cannot be undone.')) return
    setErrorMessage('')
    try {
      await deleteStoryRequest(storyId)
      setStories((savedStories) => savedStories.filter((story) => story.id !== storyId))
      if (currentStory?.id === storyId) setCurrentStory(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const displayStories = stories.map(toCardStory)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActivePage('home')} aria-label="StoryVerse home">
          <span className="brand-mark">✳</span>
          <span>story<span className="brand-accent">verse</span></span>
        </button>
        <p className="sidebar-label">YOUR SPACE</p>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={`nav-link ${activePage === item.id || (item.id === 'stories' && activePage === 'reader') ? 'nav-link-active' : ''}`}
              key={item.id}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.id === 'stories' && <span className="nav-count">{stories.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-spark">✦</span>
          <p>Every great story<br />starts with <em>what if?</em></p>
          <span className="note-small">Your next adventure is one idea away.</span>
        </div>
        <div className="profile-mini">
          <div className="avatar">N</div>
          <div><strong>Storyteller</strong><span>Free explorer</span></div>
          <span className="profile-dots">···</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activePage === 'reader' ? 'Reading' : navItems.find((item) => item.id === activePage)?.label}</strong></div>
          <div className="topbar-right"><span className="saved-indicator"><span /> {isLoadingStories || isOpeningStory ? 'Loading stories...' : 'All stories saved'}</span><button className="help-button" aria-label="Help">?</button></div>
        </header>
        {errorMessage && <div className="app-error" role="alert"><span>{errorMessage}</span><button onClick={() => setErrorMessage('')} aria-label="Dismiss error">×</button></div>}
        {activePage === 'home' && <HomePage stories={displayStories} isLoading={isLoadingStories} onCreate={() => setActivePage('create')} onOpen={openStory} onSeeAll={() => setActivePage('stories')} />}
        {activePage === 'create' && <CreateStoryPage onCreate={createStory} isCreating={isCreatingStory} onCancel={() => setActivePage('home')} />}
        {activePage === 'reader' && <ReadingPage story={currentStory} isContinuing={isContinuingStory} onChoose={chooseStory} onFinish={finishStory} onBack={() => setActivePage('stories')} />}
        {activePage === 'stories' && <MyStoriesPage stories={displayStories} isLoading={isLoadingStories} onOpen={openStory} onDelete={removeStory} onCreate={() => setActivePage('create')} />}
      </main>
    </div>
  )
}

function toCardStory(story) {
  const genre = genres.find((item) => item.name === story.genre)
  const passageCount = story.passages?.length || 1
  const updatedAt = story.updatedAt || story.createdAt

  return {
    ...story,
    theme: story.theme || story.idea,
    progress: story.finished ? 100 : Math.min(12 + (passageCount - 1) * 17, 95),
    updated: updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Saved',
    cover: genre?.icon || '✦',
    coverClass: genre?.name === 'Mystery' ? 'cover-lavender' : genre?.name === 'Sci-Fi' ? 'cover-blue' : 'cover-mint',
  }
}

function HomePage({ stories, isLoading, onCreate, onOpen, onSeeAll }) {
  const recentStories = stories.slice(0, 3)
  return (
    <div className="page-content home-page">
      <div className="welcome-row">
        <div><p className="eyebrow">THURSDAY, NOVEMBER 5</p><h1>Good morning, <span>storyteller.</span></h1><p className="welcome-subtitle">Your imagination called. It has a new story to tell.</p></div>
        <div className="welcome-sun">☼</div>
      </div>
      <section className="hero-card">
        <div className="hero-copy"><div className="hero-pill"><span>✦</span> YOUR NEXT ADVENTURE</div><h2>Stories that<br /><em>choose you back.</em></h2><p>Dream up a world. Make a choice. See where the story takes you.</p><button className="button button-dark" onClick={onCreate}>Create a story <span>↗</span></button><div className="hero-caption"><span>✧</span> No blank pages. Just possibilities.</div></div>
        <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="moon">☾</div><div className="art-book"><span>✦</span><i>once<br />upon<br />a time</i><b>✧</b></div><div className="art-star star-a">✧</div><div className="art-star star-b">✳</div><div className="art-star star-c">·</div><div className="art-leaf">❋</div><div className="art-caption">turn the page<br />to find out <span>→</span></div></div>
      </section>
      <section className="genre-section"><div className="section-heading"><div><p className="eyebrow">PICK A PATH</p><h2>What are we feeling today?</h2></div><span className="section-aside">A little mood goes a long way ✨</span></div><div className="genre-grid">{genres.map((genre) => <button className={`genre-card ${genre.tone}`} key={genre.name} onClick={onCreate}><span className="genre-icon">{genre.icon}</span><span>{genre.name}</span><span className="genre-arrow">↗</span></button>)}</div></section>
      <section className="recent-section"><div className="section-heading"><div><p className="eyebrow">BACK TO YOUR WORLDS</p><h2>Pick up where you left off</h2></div><button className="text-link" onClick={onSeeAll}>See all stories <span>→</span></button></div>{isLoading ? <p className="library-message">Loading your stories...</p> : recentStories.length ? <div className="story-grid">{recentStories.map((story) => <StoryCard key={story.id} story={story} onClick={() => onOpen(story.id)} />)}</div> : <p className="library-message">Your saved stories will appear here.</p>}</section>
      <footer className="page-footer"><span>Made for the stories only you can tell.</span><span>✳ &nbsp;storyverse</span></footer>
    </div>
  )
}

function StoryCard({ story, onClick }) {
  return <button className="story-card" onClick={onClick}><div className={`story-cover ${story.coverClass}`}><span className="cover-symbol">{story.cover}</span><span className="cover-stamp">{story.genre}</span><span className="cover-scribble">✧</span></div><div className="story-card-body"><div className="story-card-top"><span>{story.genre.toUpperCase()}</span><span>{story.updated}</span></div><h3>{story.title}</h3><p>{story.theme}</p><div className="progress-row"><div className="progress-track"><span style={{ width: `${story.progress}%` }} /></div><span>{story.finished ? 'Finished' : `${story.progress}%`}</span></div></div></button>
}

function CreateStoryPage({ onCreate, isCreating, onCancel }) {
  const [idea, setIdea] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('Fantasy')
  return <div className="page-content create-page"><button className="back-link" onClick={onCancel}>← <span>Back to home</span></button><div className="create-heading"><p className="eyebrow">A NEW WORLD AWAITS</p><h1>Let's make a little <em>magic.</em></h1><p>Start with an idea. We'll take it from there.</p></div><div className="create-layout"><section className="create-form-card"><label className="form-label" htmlFor="story-idea">YOUR STORY IDEA <span>THE SEED OF IT ALL</span></label><textarea id="story-idea" value={idea} onChange={(event) => setIdea(event.target.value)} maxLength={300} placeholder="A lighthouse keeper discovers that every ship they guide safely home disappears from the world..." /><div className="textarea-bottom"><span>Don't overthink it. A little spark is enough.</span><span>{idea.length}/300</span></div><div className="form-divider" /><p className="form-label">CHOOSE YOUR GENRE <span>SET THE MOOD</span></p><div className="genre-select-grid">{genres.map((genre) => <button type="button" key={genre.name} onClick={() => setSelectedGenre(genre.name)} className={`genre-select ${genre.tone} ${selectedGenre === genre.name ? 'genre-selected' : ''}`}><span>{genre.icon}</span>{genre.name}{selectedGenre === genre.name && <b>✓</b>}</button>)}</div><div className="form-actions"><button className="button button-light" onClick={onCancel}>Maybe later</button><button className="button button-dark" disabled={!idea.trim() || isCreating} onClick={() => onCreate(idea, selectedGenre)}>{isCreating ? 'Creating...' : 'Bring it to life'} <span>✦</span></button></div><p className="form-footnote">✦ &nbsp;Stories grow with every choice you make.</p></section><aside className="prompt-aside"><div className="prompt-art"><span>✳</span><i>what if<br />you could<br /><em>go anywhere?</em></i><b>✧</b></div><p className="eyebrow">NEED A SPARK?</p><h3>Try asking<br />“what if...?”</h3><div className="prompt-line" /><p className="prompt-example">What if the moon was a library, and every book held someone's forgotten dream?</p><p className="prompt-foot">Your idea can be as big or small as you like.</p></aside></div></div>
}

function ReadingPage({ story, isContinuing, onChoose, onFinish, onBack }) {
  const [selectedChoice, setSelectedChoice] = useState('')
  if (!story) return null
  return <div className="page-content reading-page"><div className="reader-top"><button className="back-link" onClick={onBack}>← <span>My stories</span></button><span className="reader-status"><span className="status-dot" /> {story.finished ? 'STORY COMPLETE' : 'YOUR STORY IS UNFOLDING'}</span><button className="reader-save">♡ <span>Saved</span></button></div><div className="reader-title"><span className="reader-genre">{story.genre.toUpperCase()} &nbsp;·&nbsp; AN INTERACTIVE STORY</span><h1>{story.title}</h1><p>{story.theme}</p></div><div className="reader-layout"><article className="story-paper"><div className="paper-top"><span>✳ &nbsp; STORYVERSE</span><span>CHAPTER {Math.max(1, story.passages.length).toString().padStart(2, '0')}</span></div><div className="paper-content">{story.passages.map((passage, index) => <p className={index === 0 ? 'dropcap' : ''} key={`${story.id}-passage-${index}`}>{passage}</p>)}{!story.finished && <p className="typing-line">{isContinuing ? 'Writing the next chapter...' : 'The story waits for your next choice'}<span>▍</span></p>}</div><div className="paper-bottom"><span>✦</span><span>{story.finished ? 'THE END' : 'TO BE CONTINUED'}</span><span>✦</span></div></article><aside className="choice-panel"><p className="eyebrow">YOUR MOVE</p><h2>What happens<br />next?</h2><p className="choice-hint">Choose a path. The story will follow.</p>{story.finished ? <div className="ending-box"><span>✦</span><strong>The End</strong><p>Every ending is a new beginning.</p><button className="button button-dark" onClick={onBack}>Back to my stories</button></div> : <div className="choices-list">{story.choices.map((choice, index) => <button disabled={isContinuing} key={choice} className={`choice-card ${selectedChoice === choice ? 'choice-selected' : ''}`} onClick={() => setSelectedChoice(choice)}><span className="choice-number">0{index + 1}</span><span>{choice}</span><span className="choice-chevron">→</span></button>)}<button className="button button-dark continue-button" disabled={!selectedChoice || isContinuing} onClick={async () => { await onChoose(selectedChoice); setSelectedChoice('') }}>{isContinuing ? 'Continuing...' : 'Continue the story'} <span>→</span></button><button className="finish-link" disabled={isContinuing} onClick={onFinish}>Skip ahead to an ending</button></div>}</aside></div></div>
}

function MyStoriesPage({ stories, isLoading, onOpen, onDelete, onCreate }) {
  const [filter, setFilter] = useState('All stories')
  const filters = ['All stories', 'In progress', 'Finished']
  const filteredStories = stories.filter((story) => filter === 'All stories' || (filter === 'Finished' ? story.finished : !story.finished))
  return <div className="page-content stories-page"><div className="stories-header"><div><p className="eyebrow">YOUR PERSONAL LIBRARY</p><h1>My <em>stories.</em></h1><p>Little worlds, big possibilities. All yours.</p></div><button className="button button-dark" onClick={onCreate}>＋ New story</button></div><div className="library-toolbar"><div className="filter-tabs">{filters.map((item) => <button key={item} className={filter === item ? 'filter-active' : ''} onClick={() => setFilter(item)}>{item}<span>{item === 'All stories' ? stories.length : stories.filter((story) => item === 'Finished' ? story.finished : !story.finished).length}</span></button>)}</div><span className="sort-label">Recently opened &nbsp;⌄</span></div>{isLoading ? <p className="library-message">Loading your stories...</p> : filteredStories.length ? <div className="library-grid">{filteredStories.map((story) => <div className="library-story-item" key={story.id}><StoryCard story={story} onClick={() => onOpen(story.id)} /><button className="delete-story-button" onClick={() => onDelete(story.id)}>Delete story</button></div>)}</div> : <div className="empty-library"><span>✧</span><h2>No stories here just yet</h2><p>Start a new story and watch your library grow.</p><button className="button button-dark" onClick={onCreate}>Create your first story <span>↗</span></button></div>}<footer className="page-footer"><span>{stories.length} stories in your library</span><span>✳ &nbsp;storyverse</span></footer></div>
}

export default App
