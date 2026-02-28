import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function BOMsLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Bills of Materials" table={true} />
        </AppLayout>
    );
}
