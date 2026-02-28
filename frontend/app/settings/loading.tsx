import AppLayout from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
    return (
        <AppLayout>
            <PageSkeleton title="Settings" table={false} cards={0} />
        </AppLayout>
    );
}
