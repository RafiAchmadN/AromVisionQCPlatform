import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Topbar } from '@/components/shared/topbar';
import { OperatorSidebar } from '@/components/operator/sidebar';
import { NotificationsView } from '@/components/shared/notifications-view';

export default async function OperatorNotificationsPage() {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role !== 'Operator') redirect('/login');

  return (
    <div className="flex flex-col h-screen">
      <Topbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <OperatorSidebar />
        <main className="flex-1 overflow-y-auto bg-brand-50 p-6">
          <NotificationsView />
        </main>
      </div>
    </div>
  );
}
