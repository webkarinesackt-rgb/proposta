import ProposalForm from '@/components/admin/ProposalForm'

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; whatsapp?: string }>
}) {
  const { nome, whatsapp } = await searchParams
  return <ProposalForm mode="new" prefill={{ nome, whatsapp }} />
}
