import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function WorkOrdersLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Work Orders" cards={3} table={false} />
        </AppLayout>
    );
}
