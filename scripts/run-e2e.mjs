import { spawn } from "node:child_process";
import process from "node:process";

const databaseUrl = "postgresql://makemenage:makemenage@localhost:5432/makemenage?schema=public";
const appPort = "3100";
const baseEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  APP_BASE_URL: `http://localhost:${appPort}`,
  AUTH_SECRET: "e2e-secret-change-me",
  PORT: appPort,
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });
  });
}

async function waitForCommand(command, args, timeoutMs = 30_000, options = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await run(command, args, options);

      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Timed out waiting for ${command} ${args.join(" ")}`);
}

async function waitForHttp(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // ignore until ready
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  let server;

  try {
    await run("bash", ["-lc", `fuser -k ${appPort}/tcp >/dev/null 2>&1 || true`]);
    await run("sg", ["docker", "-c", "docker compose up -d db"]);
    await waitForCommand("sg", [
      "docker",
      "-c",
      "docker compose exec -T db pg_isready -U makemenage -d makemenage",
    ]);
    await run("npx", ["prisma", "db", "push", "--force-reset"], { env: baseEnv });
    await run("npm", ["run", "db:seed"], { env: baseEnv });
    await run("npm", ["run", "build"], { env: baseEnv });

    server = spawn("npm", ["run", "start"], {
      stdio: "inherit",
      env: baseEnv,
    });

    await waitForHttp(`http://localhost:${appPort}/api/health`);
    await run("npx", ["playwright", "test"], { env: baseEnv });
  } finally {
    if (server) {
      server.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => server.on("exit", resolve)),
        new Promise((resolve) =>
          setTimeout(() => {
            server.kill("SIGKILL");
            resolve(undefined);
          }, 3_000),
        ),
      ]);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
