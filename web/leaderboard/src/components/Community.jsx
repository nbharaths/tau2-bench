import { useEffect } from 'react'
import './Blog.css'
import './Community.css'
import { COMMUNITY_EXTENSIONS } from '../data/communityExtensions'

function CommunityCard({ extension }) {
  return (
    <article className="blog-card community-card">
      <a
        className="blog-card-link"
        href={extension.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="blog-card-top">
          <span className="blog-card-label">{extension.category} · {extension.date}</span>
          <span className="blog-card-source">GitHub ↗</span>
        </div>
        <h2 className="blog-card-title">{extension.title}</h2>
        <p className="blog-card-description">{extension.description}</p>
      </a>
    </article>
  )
}

function Community() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="blog-page community-page">
      <header className="blog-page-header">
        <h1 className="blog-page-title">Community Extensions</h1>
        <p className="blog-page-subtitle">
          Projects from the research community that build on τ-bench and extend
          agent evaluation to new domains and settings.
        </p>
      </header>
      <div className="blog-grid">
        {COMMUNITY_EXTENSIONS.map((extension) => (
          <CommunityCard key={extension.slug} extension={extension} />
        ))}
      </div>
    </div>
  )
}

export default Community
