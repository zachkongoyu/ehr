"use client";

import { useState } from "react";
import { Button } from "@/components/motion/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/motion/card";
import { Input } from "@/components/motion/input";
import { authClient } from "@/lib/auth-client";
import type { Copy } from "@/lib/copy";

export function SignInForm({ copy }: { copy: Copy }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{copy.signIn}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            const result = await authClient.signIn.email({
              email,
              password,
              callbackURL: "/patients",
            });
            if (result.error) setError(copy.signInFailed);
          }}
        >
          <Input label={copy.email} type="email" value={email} onChange={setEmail} />
          <Input
            label={copy.password}
            type="password"
            value={password}
            onChange={setPassword}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" size="sm">
            {copy.signIn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
