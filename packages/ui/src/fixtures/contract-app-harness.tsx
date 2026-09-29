import { examples as cases } from "../../examples/app.tsx";
import { runContract } from "../test-utils/contract.tsx";

export { cases };

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
