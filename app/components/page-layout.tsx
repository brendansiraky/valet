import { cn } from "~/lib/utils";

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function PageLayout({
  title,
  description,
  children,
  headerActions,
  className,
  ...props
}: PageLayoutProps) {
  return (
    <div
      className={cn("container mx-auto px-4 py-8 sm:px-6 lg:px-8", className)}
      {...props}
    >
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">{headerActions}</div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
