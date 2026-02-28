import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Dashboard" cards={4} table={false} />
        </AppLayout>
    );
}
