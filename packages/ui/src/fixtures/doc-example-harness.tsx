import { render } from "@arachnejs/render";
import { DocExample, DocPage } from "../index.ts";

export function run(root: HTMLElement) {
	const dispose = render(
		() => (
			<>
				<DocExample id="default" title="Colours" code="<Button />">
					preview
				</DocExample>
				<DocExample id="nested" title="Sizes" titleOrder={4} code="<Button />">
					preview
				</DocExample>
				<DocPage id="page" title="Buttons">
					body
				</DocPage>
				<DocPage id="embedded" title="Inputs" titleOrder={3}>
					body
				</DocPage>
			</>
		),
		root,
	);
	return { dispose };
}
