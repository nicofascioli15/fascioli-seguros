import MantItemsPage from '@/components/MantItemsPage'

export const dynamic = 'force-dynamic'

export default function TanquesPage() {
  return <MantItemsPage tabla="mant_tanques" titulo="Tanques de agua" singular="tanque" />
}
