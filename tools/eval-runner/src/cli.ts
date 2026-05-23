import { runSmoke } from "./smoke.js";

function printHelp(): void {
  console.log("Usage: ancora-eval-runner --smoke");
}

export function main(args: readonly string[] = process.argv.slice(2)): number {
  if (args.includes("--smoke")) {
    console.log(JSON.stringify(runSmoke(), undefined, 2));
    return 0;
  }

  printHelp();
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
