import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { Topbar } from '@/components/shared/topbar';
import { OperatorSidebar } from '@/components/operator/sidebar';
import { OperatorLotPanel } from '@/components/operator/lot-panel';
import { OperatorCameraPanel } from '@/components/operator/camera-panel';

export default async function OperatorDashboard() {
  const user = await getServerSession();
  if (!user) redirect('/login');
  if (user.role !== 'Operator') redirect('/login');

  return (
    <div className="flex flex-col h-screen">
      <Topbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <OperatorSidebar />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r border-brand-100 flex flex-col overflow-hidden">
            <OperatorCameraPanel />
          </div>
          <div className="w-1/2 flex flex-col overflow-hidden">
            <OperatorLotPanel operatorId={user.id} operatorName={user.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
