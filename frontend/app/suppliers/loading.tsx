import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function SuppliersLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Suppliers" table={true} />
        </AppLayout>
    );
}
