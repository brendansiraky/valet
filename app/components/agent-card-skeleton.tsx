import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Skeleton placeholder that matches the AgentCard/ResourceCard layout.
 * Shows animated placeholders for title, timestamp, description (3 lines), and 3 action buttons.
 */
export function AgentCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        {/* Title skeleton */}
        <Skeleton className="h-5 w-32" />
        {/* "Updated X ago" skeleton */}
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="flex-1">
        {/* Description skeleton - 3 lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        {/* Button skeletons: Test, Edit, Delete */}
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-20" />
      </CardFooter>
    </Card>
  );
}
