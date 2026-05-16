export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  )
}

export function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-24">
      <LoadingDots />
    </div>
  )
}

export function PageError({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-sm text-red-400">{message}</p>
      {children}
    </div>
  )
}