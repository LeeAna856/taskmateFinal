import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

/**
 * First screen of the app: clipboard logo, tagline and a start button
 * that sends the visitor to the login screen.
 */
export default function Welcome() {
  return (
    <div className="tm-welcome">
      <header className="tm-welcome__top">
        <Logo />
        <div className="tm-welcome__top-actions">
          <Link to="/login" className="tm-btn tm-btn--secondary tm-btn--sm">
            Log in
          </Link>
          <Link to="/register" className="tm-btn tm-btn--primary tm-btn--sm">
            Create account
          </Link>
        </div>
      </header>

      <main className="tm-welcome__hero">
        <div className="tm-welcome__badge">
          <i className="bi bi-stars" aria-hidden="true" />
          Your day, beautifully organised
        </div>

        <span className="tm-welcome__clipboard" aria-hidden="true">
          <i className="bi bi-clipboard-check" />
        </span>

        <h1 className="tm-welcome__title">TaskMate</h1>
        <p className="tm-welcome__tagline">Stay organized, one task at a time</p>
        <p className="tm-welcome__lead">
          Plan your day, track your progress and celebrate every win. TaskMate keeps your tasks, deadlines and
          team in one calm, focused workspace.
        </p>

        <div className="tm-welcome__actions">
          <Link to="/login" className="tm-btn tm-btn--primary tm-btn--lg">
            Start <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
          <Link to="/register" className="tm-btn tm-btn--secondary tm-btn--lg">
            Create an account
          </Link>
        </div>

        <div className="tm-welcome__points">
          <span>
            <i className="bi bi-check2-circle" aria-hidden="true" /> List, board &amp; calendar views
          </span>
          <span>
            <i className="bi bi-bell" aria-hidden="true" /> Smart deadline reminders
          </span>
          <span>
            <i className="bi bi-people" aria-hidden="true" /> Assign teammates
          </span>
        </div>
      </main>

      <div className="tm-welcome__preview" aria-hidden="true">
        <div className="tm-welcome__card">
          <span className="tm-welcome__card-icon tm-welcome__card-icon--blue">
            <i className="bi bi-list-check" />
          </span>
          <div>
            <strong>12 tasks</strong>
            <span>Planned for this week</span>
          </div>
        </div>
        <div className="tm-welcome__card tm-welcome__card--float">
          <span className="tm-welcome__card-icon tm-welcome__card-icon--green">
            <i className="bi bi-graph-up-arrow" />
          </span>
          <div>
            <strong>78% complete</strong>
            <span>Great progress this month</span>
          </div>
        </div>
      </div>

      <footer className="tm-welcome__footer">
        © {new Date().getFullYear()} TaskMate · <Link to="/privacy">Privacy Policy</Link>
      </footer>
    </div>
  )
}
