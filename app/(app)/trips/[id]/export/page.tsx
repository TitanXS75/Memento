import { TripExportView } from '@/components/app/TripExportView'

export function generateStaticParams() {
  return [{ id: 'default' }]
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function TripExportPage({ params }: Props) {
  const { id } = await params
  return <TripExportView id={id} />
}
