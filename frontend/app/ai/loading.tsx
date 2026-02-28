import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function AILoading() {
    return (
        <AppLayout>
            <PageSkeleton title="AI Assistant" table={false} cards={0} />
        </AppLayout>
    );
}
