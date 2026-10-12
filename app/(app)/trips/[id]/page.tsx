import { TripDetailView } from '@/components/app/TripDetailView'

export function generateStaticParams() {
  return [{ id: 'default' }]
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params
  return <TripDetailView id={id} />
}
