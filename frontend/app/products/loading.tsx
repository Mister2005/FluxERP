import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function ProductsLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Products" table={true} />
        </AppLayout>
    );
}
