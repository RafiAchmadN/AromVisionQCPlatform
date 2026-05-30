import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Topbar } from '@/components/shared/topbar';
import { OperatorSidebar } from '@/components/operator/sidebar';
import { OperatorWorkspace } from '@/components/operator/workspace';

export default async function OperatorDashboard() {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role !== 'Operator') redirect('/login');

  return (
    <div className="flex flex-col h-screen">
      <Topbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <OperatorSidebar />
        <OperatorWorkspace operatorId={user.id} operatorName={user.name} />
      </div>
    </div>
  );
}
