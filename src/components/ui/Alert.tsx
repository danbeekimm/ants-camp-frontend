type AlertVariant = 'error' | 'warn' | 'info' | 'success'

const STYLES: Record<AlertVariant, string> = {
  error:   'bg-red-50   border-red-200   text-red-700   dark:bg-red-950   dark:border-red-800   dark:text-red-300',
  warn:    'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300',
  info:    'bg-blue-50  border-blue-200  text-blue-700  dark:bg-blue-950  dark:border-blue-800  dark:text-blue-300',
  success: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300',
}

export function Alert({
  variant = 'error',
  children,
  className,
}: {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`border text-sm px-4 py-3 rounded-xl ${STYLES[variant]}${className ? ' ' + className : ''}`}>
      {children}
    </div>
  )
}