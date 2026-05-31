import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Topbar } from '@/components/shared/topbar';
import { ManagerSidebar } from '@/components/manager/sidebar';
import { ManagerReportsContent } from './reports-content';

export default async function ManagerReportsPage() {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role !== 'Manager') redirect('/login');

  return (
    <div className="flex flex-col h-screen">
      <Topbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <ManagerSidebar />
        <main className="flex-1 overflow-y-auto bg-brand-50 p-6">
          <ManagerReportsContent />
        </main>
      </div>
    </div>
  );
}
