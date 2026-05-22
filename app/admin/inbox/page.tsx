import { Suspense } from 'react'
import InboxView from '@/components/admin/InboxView'

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxView />
    </Suspense>
  )
}
