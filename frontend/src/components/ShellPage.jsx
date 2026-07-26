/** Shared page frame for shell destinations — fills the main column, no right-anchor. */
export default function ShellPage({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:px-8 ${className}`}>
      {children}
    </div>
  )
}
