import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Privacy() {
  return (
    <div className="tm-legal">
      <header className="tm-legal__head">
        <Logo />
        <Link to="/register" className="tm-btn tm-btn--secondary tm-btn--sm">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Back
        </Link>
      </header>

      <article className="tm-legal__card">
        <h1>Privacy Policy</h1>
        <p className="tm-legal__updated">Last updated: 6 November 2026</p>

        <h2>1. Information we collect</h2>
        <p>
          When you create a TaskMate account we store your name, email address, a securely hashed password and,
          optionally, a profile photo. We also store the tasks, comments and notifications you create so the
          application can show them back to you.
        </p>

        <h2>2. How we use your information</h2>
        <p>
          Your information is used solely to operate TaskMate: authenticating you, displaying your tasks and
          dashboard statistics, sending deadline reminders, and letting assigned teammates collaborate on shared
          tasks.
        </p>

        <h2>3. Data storage</h2>
        <p>
          Task data is stored in a MySQL database owned by the TaskMate installation. Passwords are never stored
          in plain text. Session tokens can be revoked at any time by logging out.
        </p>

        <h2>4. Your choices</h2>
        <p>
          You can edit your profile details, change your password, delete tasks (they move to Trash) and empty
          the Trash to permanently remove them at any time.
        </p>

        <h2>5. Contact</h2>
        <p>
          Questions about your data? Reach out to the TaskMate administrator for the workspace you use.
        </p>

        <Link to="/register" className="tm-btn tm-btn--primary">
          Back to Create Account
        </Link>
      </article>
    </div>
  )
}
