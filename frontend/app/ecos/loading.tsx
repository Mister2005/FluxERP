import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function ECOsLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Engineering Change Orders" table={true} />
        </AppLayout>
    );
}
