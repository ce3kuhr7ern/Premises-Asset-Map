import { listContractorsForCurrentOrg } from '@/app/actions/suppliers';
import SupplierRegisterPanel from './SupplierRegisterPanel';

export const metadata = { title: 'Suppliers' };

export default async function SuppliersPage() {
  const { rows, categories } = await listContractorsForCurrentOrg();
  return <SupplierRegisterPanel rows={rows} categories={categories} />;
}
