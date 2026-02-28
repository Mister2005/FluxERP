import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function ReportsLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Reports" cards={4} table={false} />
        </AppLayout>
    );
}
