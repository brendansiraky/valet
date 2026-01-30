import { useUser } from "~/contexts/user-context";

export default function Dashboard() {
  const user = useUser();

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Welcome back!</h1>
        <p className="text-lg text-muted-foreground">
          You are signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
