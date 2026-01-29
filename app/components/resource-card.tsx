import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface ResourceCardProps {
  title: string;
  updatedAt: Date | string;
  /** Optional description - CardContent only renders if provided */
  description?: string;
  actions: ReactNode;
  /** Optional left border color (e.g., for traits) */
  accentColor?: string;
  /** Optional link for the title */
  titleHref?: string;
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return diffDay === 1 ? "1 day ago" : `${diffDay} days ago`;
  }
  if (diffHour > 0) {
    return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
  }
  if (diffMin > 0) {
    return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
  }
  return "just now";
}

export function ResourceCard({
  title,
  updatedAt,
  description,
  actions,
  accentColor,
  titleHref,
}: ResourceCardProps) {
  const titleElement = titleHref ? (
    <Link to={titleHref} className="hover:underline">
      {title}
    </Link>
  ) : (
    title
  );

  return (
    <Card
      className={`flex flex-col${accentColor ? " border-l-4" : ""}`}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{titleElement}</CardTitle>
        <CardDescription>
          Updated {formatRelativeTime(updatedAt)}
        </CardDescription>
      </CardHeader>
      {description && (
        <CardContent className="flex-1">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {description}
          </p>
        </CardContent>
      )}
      <CardFooter className="flex-wrap gap-2">{actions}</CardFooter>
    </Card>
  );
}
