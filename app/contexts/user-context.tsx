import { createContext, useContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
}

const UserContext = createContext<AuthUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): AuthUser {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useUser must be used within UserProvider");
  }
  return user;
}
