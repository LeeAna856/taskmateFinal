/**
 * The four live summary cards shown on the dashboard.
 */
export default function SummaryCards({ stats = {} }) {
  const cards = [
    {
      key: 'all',
      label: 'Total Tasks',
      hint: 'Everything in your workspace',
      value: stats.all ?? 0,
      icon: 'bi-collection',
      tone: 'blue',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      hint: 'Currently being worked on',
      value: stats.in_progress ?? 0,
      icon: 'bi-hourglass-split',
      tone: 'amber',
    },
    {
      key: 'not_started',
      label: 'Not Started',
      hint: 'Waiting for your attention',
      value: stats.not_started ?? 0,
      icon: 'bi-circle',
      tone: 'slate',
    },
    {
      key: 'completed',
      label: 'Completed',
      hint: 'Finished and ticked off',
      value: stats.completed ?? 0,
      icon: 'bi-check2-circle',
      tone: 'green',
    },
  ]

  return (
    <div className="tm-stats">
      {cards.map((card) => (
        <div className="tm-stat tm-stat--card" key={card.key}>
          <div className="tm-stat__top">
            <span className={`tm-stat__icon tm-stat__icon--${card.tone}`} aria-hidden="true">
              <i className={`bi ${card.icon}`} />
            </span>
            <span className="tm-stat__spark" aria-hidden="true">
              <i className={`bi ${card.key === 'completed' ? 'bi-arrow-up-right' : 'bi-three-dots'}`} />
            </span>
          </div>
          <div className="tm-stat__value">{card.value}</div>
          <div className="tm-stat__label">{card.label}</div>
          <div className="tm-stat__hint">{card.hint}</div>
        </div>
      ))}
    </div>
  )
}
