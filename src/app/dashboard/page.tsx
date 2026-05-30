import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role === 'Admin') redirect('/admin/dashboard');
  if (user.role === 'Manager') redirect('/manager/dashboard');
  redirect('/operator/dashboard');
}
