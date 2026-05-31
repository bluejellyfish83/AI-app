'use client'

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void
}

export function ChatEmptyState({ onSuggestionClick: _ }: ChatEmptyStateProps) {
  return <div className="flex-1" aria-hidden="true" />
}
