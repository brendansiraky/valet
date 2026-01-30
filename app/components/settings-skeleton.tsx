import {
  Card,
  CardContent,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { PageLayout } from "~/components/page-layout";

/**
 * Skeleton placeholder for the Settings page.
 * Shows animated placeholders matching the card-based settings layout:
 * Profile, Anthropic API, OpenAI API, and Appearance sections.
 */
export function SettingsSkeleton() {
  return (
    <PageLayout
      title="Settings"
      description="Manage your account, API keys, and preferences"
      className="max-w-2xl"
    >
      <div className="space-y-8">
        {/* Profile Section Skeleton */}
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>

        {/* Anthropic API Section Skeleton */}
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>

        {/* OpenAI API Section Skeleton */}
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>

        {/* Appearance Section Skeleton */}
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-44" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Section Skeleton */}
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-24" />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
